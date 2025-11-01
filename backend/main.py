# backend/main.py

from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image
import pytesseract
import fitz  # PyMuPDF
import uvicorn
import os
import io

# --- Import Your Real Services ---
import google.generativeai as genai
from supabase_service import get_notes, add_note, get_user_id_from_token

# ---
# --- 🛠️ CRITICAL TESSERACT FIX 🛠️ ---
pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'
# ------------------------------------
# ---

# --- Configuration ---
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
    print("Gemini API configured successfully.")
else:
    print("WARNING: GEMINI_API_KEY not found. AI features will be skipped.")

EXTENSION_ID = "fgppkhbbafbfdcdfandjhfaicifnjckb" # Use your real extension ID here

# --- Pydantic Models ---
class QueryWithContext(BaseModel):
    text: str = ""
    question: str = ""
    command: str = "QUERY_FACTUAL"
    output_language: str = "en"

class Note(BaseModel):
    title: str
    content: str
    notebook_id: int | None = None

# --- FastAPI App & AI Model Initialization ---
app = FastAPI(title="NotePilot AI Backend")
model = genai.GenerativeModel('gemini-1.5-flash')

# --- CORS (Security) ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:3000",  # Allow your React app
        f"chrome-extension://{EXTENSION_ID}",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Authentication Dependency ---
def verify_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid token")
    token = authorization.split(" ")[1]
    user_id = get_user_id_from_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token or user")
    return user_id

# --- File Upload Endpoint (Hybrid + AI Cleanup) ---
@app.post("/api/upload_and_analyze")
async def upload_and_analyze(file: UploadFile = File(...)):
    content_type = file.content_type
    filename = file.filename
    raw_text = ""
    analysis_ready = ""
    
    OCR_LANG = 'eng' 
    OCR_CONFIG = '--psm 6' 

    try:
        if "image" in content_type:
            image_bytes = await file.read()
            image = Image.open(io.BytesIO(image_bytes))
            raw_text = pytesseract.image_to_string(image, lang=OCR_LANG, config=OCR_CONFIG)
            analysis_ready = f"Image '{filename}' OCR extracted."

        elif "pdf" in content_type:
            pdf_bytes = await file.read()
            doc = fitz.open(stream=pdf_bytes, filetype="pdf")
            
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                text = page.get_text("text")

                if text.strip():
                    raw_text += f"\n--- Page {page_num + 1} (Digital Text) ---\n{text}"
                else:
                    pix = page.get_pixmap(dpi=300) 
                    img_bytes = pix.tobytes("png")
                    image = Image.open(io.BytesIO(img_bytes))
                    ocr_text = pytesseract.image_to_string(image, lang=OCR_LANG, config=OCR_CONFIG)
                    raw_text += f"\n--- Page {page_num + 1} (Scanned OCR) ---\n{ocr_text}"
            
            doc.close()
            analysis_ready = f"PDF '{filename}' extracted (Hybrid Text + OCR)."
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported file type: {content_type}")

        # --- AI CLEANUP STEP (Corrected Prompt) ---
        print("--- Sending raw OCR text to Gemini for cleanup... ---")
        prompt = f"""
        You are an expert at cleaning OCR text from a university lab manual.
        The following text is a C language lab manual. It contains digital text, scanned images (OCR), and C code.
        It contains many OCR errors.
        
        Your task is to fix all errors while preserving the document structure.
        
        1.  Clean up C code: Fix syntax errors, OCR mistakes (like 'Q' for '0', 'A' for '1', 'rn' for 'm', '¢' for '•').
        2.  Preserve all headings: Keep "Experiment - 1", "Aim:", "Program:", "Output:", "Test case:", and "Result:".
        3.  **CRITICAL:** Preserve all content *under* these headings, especially the user's test case data (like "13569") in the "Output:" sections.
        4.  Preserve the page markers (--- Page X ---).
        
        Do not delete any sections.
        
        RAW TEXT:
        {raw_text}
        """
        
        response = model.generate_content(prompt)
        cleaned_text = response.text
        # ---------------------------

        return {
            "status": "success",
            "filename": filename,
            "ocr_text": cleaned_text, # Send the CLEANED text
            "analysis_ready": analysis_ready
        }

    except Exception as e:
        print(f"Error during file analysis: {e}")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")


# --- Main AI Endpoint (Real AI) ---
@app.post("/api/analyze")
def analyze_query(query: QueryWithContext):
    context = query.text
    user_question = query.question
    command = query.command
    output_language = query.output_language

    answer = ""
    citation = "N/A"
    source = "NotePilot AI Engine (Gemini 1.5 Flash)"
    prompt = ""

    try:
        if command == "QUERY_FACTUAL" and not context:
            prompt = user_question
        elif command == "SUMMARIZE":
            prompt = f"Summarize the following text: {context}"
        elif command == "TRANSLATE":
            prompt = f"Translate the following text to {output_language}: {context}"
        elif command == "REWRITE":
            prompt = f"Rewrite and improve the following text: {context}"
        # --- NEW PROOFREAD COMMAND ---
        elif command == "PROOFREAD":
            prompt = f"Proofread the following text. Correct spelling and grammar mistakes. Only return the corrected text: {context}"
        # -----------------------------
        elif command == "QUERY_FACTUAL" and context:
            prompt = f"Based on the following context, answer the question.\nContext: {context}\nQuestion: {user_question}"
        else:
            raise HTTPException(status_code=400, detail=f"Unknown command: {command}")
        
        response = model.generate_content(prompt)
        answer = response.text

    except Exception as e:
        answer = f"An error occurred while processing your request: {str(e)}"
        source = "Error Handler"

    return {
        "command": command,
        "answer": answer,
        "source": source,
        "citation": citation
    }

# --- Supabase Note Endpoints (For Web App) ---
@app.get("/api/notes")
def api_get_notes(user_id: str = Depends(verify_user)):
    return get_notes(user_id)

@app.post("/api/notes")
def api_add_note(note: Note, user_id: str = Depends(verify_user)):
    return add_note(user_id, note.title, note.content, note.notebook_id)

# --- Root Endpoint ---
@app.get("/")
def read_root():
    return {"message": "NotePilot backend is up! Ready for extension/web app."}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)