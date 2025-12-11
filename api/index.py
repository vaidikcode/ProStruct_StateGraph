import os
import uvicorn
from typing import TypedDict, Annotated
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from contextlib import asynccontextmanager
from dotenv import load_dotenv

from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import StateGraph, END


load_dotenv()

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
if not GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY environment variable is not set!")

llm = ChatGoogleGenerativeAI(model="models/gemini-flash-latest", temperature=0)

class GraphState(TypedDict):
    image_data: str         
    user_prompt: str      
    visual_analysis: str    
    final_response: str 


def node_inspector(state: GraphState):
    """Node 1: Looks at the image and extracts raw technical details."""
    print("--- 🏗️ Node 1: Inspector is analyzing visual data... ---")

    prompt = """
    Analyze this image strictly for construction and structural engineering details. 
    List the following if visible:
    1. Material types (Wood, Concrete, Steel, Drywall).
    2. Structural members (Beams, Columns, Joists, Headers).
    3. Signs of stress (Cracks, sagging, water damage).
    4. Context (Interior, Exterior, Foundation, Roof).
    
    Be purely descriptive. Do not give advice yet.
    """
    
    msg = HumanMessage(
        content=[
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{state['image_data']}"}}
        ]
    )
    
    response = llm.invoke([msg])
    # Extract text content if response is structured
    analysis_text = response.content
    if isinstance(analysis_text, list):
        analysis_text = ''.join([part.get('text', '') if isinstance(part, dict) else str(part) for part in analysis_text])
    return {"visual_analysis": str(analysis_text)}

def node_consultant(state: GraphState):
    """Node 2: Takes the analysis + user question and formulates the advice."""
    print("--- 👷 Node 2: Consultant is drafting response... ---")
    
    analysis = state['visual_analysis']
    user_q = state['user_prompt']
    
    # Business Logic Prompt
    prompt_content = f"""
    You are a Lead Engineer at 'ProStruct Engineering'. 
    
    CONTEXT:
    - We specialize in Structural Permits, Calculations, and Soft-Story Retrofits.
    - We operate in CA, WA, OR.
    - We value: Speed (2-3 week turnaround), Accuracy, and Permit Success.
    
    INPUT DATA:
    - Visual Inspection Report: {analysis}
    - User Question: "{user_q}"
    
    INSTRUCTIONS:
    1. Answer the user's question directly using the Visual Inspection Report.
    2. Explain *why* the visual details matter (e.g., "Since I see a header beam...").
    3. Keep a professional but helpful tone.
    4. MANDATORY DISCLAIMER: Always mention that this is a preliminary AI analysis and they need a site visit for a legal permit.
    5. CALL TO ACTION: Ask if they want a "Free Quote" for a site visit.
    """
    
    response = llm.invoke([HumanMessage(content=prompt_content)])
    
    # Extract text content if response is structured
    response_text = response.content
    if isinstance(response_text, list):
        response_text = ''.join([part.get('text', '') if isinstance(part, dict) else str(part) for part in response_text])
    return {"final_response": str(response_text)}

# --- 4. BUILD THE GRAPH ---
workflow = StateGraph(GraphState)

workflow.add_node("inspector", node_inspector)
workflow.add_node("consultant", node_consultant)

# Linear flow: Inspector -> Consultant -> End
workflow.set_entry_point("inspector")
workflow.add_edge("inspector", "consultant")
workflow.add_edge("consultant", END)

app_graph = workflow.compile()

# --- 5. FASTAPI SETUP ---
app = FastAPI(title="ProStruct AI Estimator")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic model for API Input
class AnalyzeRequest(BaseModel):
    image_base64: str
    question: str

@app.post("/analyze")
async def analyze_project(request: AnalyzeRequest):
    try:
        # Run the graph
        inputs = {
            "image_data": request.image_base64,
            "user_prompt": request.question,
            "visual_analysis": "",
            "final_response": ""
        }
        
        # Invoke the graph
        result = app_graph.invoke(inputs)
        
        return {
            "analysis": result["visual_analysis"],
            "response": result["final_response"]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)