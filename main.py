import os
import secrets
from fastapi import FastAPI, Request, Depends, HTTPException, status
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import database

# Initialize database schemas and seed defaults
database.init_db()

app = FastAPI(title="AI-Solutions - Premium Enterprise System", version="1.0.0")


# Add this line right here:
app.mount("/static", StaticFiles(directory="static"), name="static")

# Enable CORS for local development and testing
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Active Admin Session Tokens stored in-memory
ACTIVE_TOKENS = {}

# Pydantic schemas for payload validation
class InquirySchema(BaseModel):
    name: str = Field(..., min_length=1)
    email: str = Field(..., min_length=3)
    phone: str = None
    company_name: str = None
    country: str = None
    job_title: str = None
    job_details: str = Field(..., min_length=5)

class LoginSchema(BaseModel):
    username: str
    password: str

class ReviewSchema(BaseModel):
    name: str = Field(..., min_length=1)
    job_title: str = None
    rating: int = Field(..., ge=1, le=5)
    feedback: str = Field(..., min_length=5)

class ChatMessageSchema(BaseModel):
    message: str

# Admin Authentication Dependency
def get_current_admin(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token is missing. Please log in again."
        )
    token = auth_header.split(" ")[1]
    if token not in ACTIVE_TOKENS:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session has expired or is invalid. Please re-authenticate."
        )
    return ACTIVE_TOKENS[token]

# --- HTML TEMPLATE ROUTING ---

@app.get("/", response_class=HTMLResponse)
async def serve_index(request: Request):
    index_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "index.html")
    if not os.path.exists(index_path):
        raise HTTPException(status_code=404, detail="Index file not found")
    with open(index_path, "r", encoding="utf-8") as f:
        return f.read()

@app.get("/admin", response_class=HTMLResponse)
async def serve_admin(request: Request):
    admin_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "admin.html")
    if not os.path.exists(admin_path):
        raise HTTPException(status_code=404, detail="Admin dashboard file not found")
    with open(admin_path, "r", encoding="utf-8") as f:
        return f.read()

# --- API ENDPOINTS ---

# 1. Contact Form Submission
@app.post("/api/inquire")
async def post_inquiry(inquiry: InquirySchema):
    try:
        database.save_inquiry(inquiry.model_dump())
        return {"status": "success", "message": "Your inquiry has been submitted successfully. Our AI consultancy team will contact you shortly."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# 2. Public Review Submission
@app.post("/api/reviews")
async def post_review(review: ReviewSchema):
    try:
        database.save_review(review.model_dump())
        return {"status": "success", "message": "Thank you for your feedback! Your review has been submitted for moderator approval."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# 3. Retrieve Approved Reviews (for homepage slider)
@app.get("/api/reviews")
async def list_approved_reviews():
    try:
        reviews = database.get_approved_reviews()
        return reviews
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")

# 4. Admin Login
@app.post("/api/admin/login")
async def admin_login(login: LoginSchema):
    username = login.username.strip()
    password = login.password
    
    if database.verify_admin(username, password):
        # Generate secure random session token
        token = secrets.token_hex(24)
        ACTIVE_TOKENS[token] = username
        return {"status": "success", "token": token, "username": username}
    else:
        raise HTTPException(status_code=401, detail="Invalid username or password credentials.")

# 5. Retrieve Admin Stats (KPIs & Charts)
@app.get("/api/admin/stats")
async def get_admin_stats(username: str = Depends(get_current_admin)):
    try:
        stats = database.get_inquiry_stats()
        return stats
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 6. Retrieve All Inquiries (Admin)
@app.get("/api/admin/inquiries")
async def get_all_inquiries_endpoint(username: str = Depends(get_current_admin)):
    try:
        inquiries = database.get_all_inquiries()
        return inquiries
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 7. Update Inquiry Status to 'read' (Admin)
@app.put("/api/admin/inquiries/{inquiry_id}/read")
async def read_inquiry_endpoint(inquiry_id: int, username: str = Depends(get_current_admin)):
    try:
        database.mark_inquiry_read(inquiry_id)
        return {"status": "success", "message": "Inquiry marked as read."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 8. Delete Inquiry (Admin)
@app.delete("/api/admin/inquiries/{inquiry_id}")
async def delete_inquiry_endpoint(inquiry_id: int, username: str = Depends(get_current_admin)):
    try:
        database.delete_inquiry(inquiry_id)
        return {"status": "success", "message": "Inquiry successfully deleted."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 9. Retrieve All Reviews for Moderation (Admin)
@app.get("/api/admin/reviews")
async def get_all_reviews_endpoint(username: str = Depends(get_current_admin)):
    try:
        reviews = database.get_all_reviews()
        return reviews
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 10. Approve Review (Admin)
@app.put("/api/admin/reviews/{review_id}/approve")
async def approve_review_endpoint(review_id: int, username: str = Depends(get_current_admin)):
    try:
        database.approve_review(review_id)
        return {"status": "success", "message": "Review has been approved and is now live."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 11. Delete Review (Admin)
@app.delete("/api/admin/reviews/{review_id}")
async def delete_review_endpoint(review_id: int, username: str = Depends(get_current_admin)):
    try:
        database.delete_review(review_id)
        return {"status": "success", "message": "Review successfully deleted."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 12. Smart Virtual Assistant Bot API
@app.post("/api/chat")
async def process_chat(data: ChatMessageSchema):
    msg = data.message.lower().strip()
    
    # Simple rule-based expert conversational routing
    if any(k in msg for k in ["hello", "hi", "hey", "greetings", "good morning", "good afternoon"]):
        reply = "Hello! I am your AI-Solutions Virtual Assistant. I can tell you about our AI services, show our past projects, walk you through client testimonials, guide you through pricing, or assist in contacting our team. How can I help you today?"
    
    elif any(k in msg for k in ["service", "what do you offer", "what do you do", "solutions", "technology", "nlp", "computer vision", "automation"]):
        reply = "AI-Solutions provides state-of-the-art AI software solutions: <br><br>• <b>Natural Language Processing (NLP):</b> Sentiment tools, custom LLMs, and intelligent search.<br>• <b>Computer Vision:</b> Object detection, neural vision quality analysis, and biometric systems.<br>• <b>Robotic Process Automation (RPA):</b> Workflow bots to eliminate manual bottlenecks.<br>• <b>Predictive Analytics:</b> High-velocity machine learning for data forecasting.<br><br>Would you like to speak to a consultant? You can fill out our Contact Us form below!"
        
    elif any(k in msg for k in ["project", "portfolio", "past", "work", "case study", "studies", "demo"]):
        reply = "Our projects highlight our enterprise capabilities:<br><br>• <b>SmartRetail:</b> Deployed neural customer tracking, boosting retail conversions by 22%.<br>• <b>FinAI Engine:</b> Custom risk forecasting models processing massive financial datasets with 94% forecast precision.<br>• <b>HealthVision ML:</b> Deep-learning scanning algorithms supporting healthcare technicians in medical image categorization.<br><br>Type 'contact' if you'd like us to build a custom solution for your enterprise."
        
    elif any(k in msg for k in ["contact", "touch", "support", "hire", "phone", "email", "form", "write", "submit"]):
        reply = "We'd love to partner with you! You can submit your requirements via the <b>Contact Us form</b> on our website. Alternatively, reach out directly at <b>contact@ai-solutions.com</b>. An enterprise specialist will follow up in 24 business hours."
        
    elif any(k in msg for k in ["review", "feedback", "rating", "testimonial", "star", "client"]):
        reply = "Our client ratings average 4.9 out of 5 stars! Enterprise partners love our work. Sarah Jenkins (CTO, FinVantage Group) wrote: <i>'AI-Solutions completely streamlined our data analytics process.'</i><br><br>You can see more reviews or submit your own review using the <b>Write a Review</b> form on this page!"
        
    elif any(k in msg for k in ["price", "cost", "quote", "charge", "rate"]):
        reply = "Our software systems are custom-crafted to meet the specific operations of our clients. To receive an accurate project quote and architecture consultation, please outline your job details in our <b>Contact Us form</b>, and we will schedule an initial mapping session."
        
    elif any(k in msg for k in ["admin", "dashboard", "login"]):
        reply = "The administrative dashboard is located at <a href='/admin' style='color:#d4af37; text-decoration:underline;'>/admin</a>. Authorized personnel must log in with their credentials to moderate client feedback and review contact inquiries."
        
    else:
        reply = "Interesting query! I am specifically programmed to assist with AI-Solutions' offerings. Try typing keywords like <b>'services'</b>, <b>'projects'</b>, <b>'reviews'</b>, <b>'pricing'</b>, or <b>'contact'</b>, or describe your needs in the Contact Us form."

    return {"response": reply}

# Mount static folder for asset serving (must be placed after HTML routes to avoid intercepting '/')
static_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir)

app.mount("/", StaticFiles(directory=static_dir), name="static")

if __name__ == "__main__":
    import uvicorn
    # Start the server on localhost:8000
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
