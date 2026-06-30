import sqlite3
import hashlib
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ai_solutions.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def hash_password(password: str, salt: bytes = None) -> tuple[str, str]:
    if salt is None:
        salt = os.urandom(16)
    else:
        if isinstance(salt, str):
            salt = bytes.fromhex(salt)
    pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
    return pwd_hash.hex(), salt.hex()

def verify_password(password: str, stored_hash: str, salt_hex: str) -> bool:
    try:
        salt = bytes.fromhex(salt_hex)
        pwd_hash = hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000)
        return pwd_hash.hex() == stored_hash
    except Exception:
        return False

def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # 1. Create inquiries table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS inquiries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        phone TEXT,
        company_name TEXT,
        country TEXT,
        job_title TEXT,
        job_details TEXT,
        status TEXT DEFAULT 'new',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # 2. Create admins table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS admins (
        username TEXT PRIMARY KEY,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL
    )
    """)
    
    # 3. Create reviews table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        job_title TEXT,
        rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
        feedback TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    conn.commit()
    
    # Seed default admin user if not exists
    cursor.execute("SELECT * FROM admins WHERE username = 'admin'")
    if not cursor.fetchone():
        hashed_pwd, salt_hex = hash_password("AdminGolden2026!")
        cursor.execute("INSERT INTO admins (username, password_hash, salt) VALUES (?, ?, ?)", 
                       ("admin", hashed_pwd, salt_hex))
        conn.commit()
        print("Database seeded: Default admin created (admin / AdminGolden2026!)")
        
    # Seed default reviews if reviews table is empty
    cursor.execute("SELECT COUNT(*) FROM reviews")
    if cursor.fetchone()[0] == 0:
        default_reviews = [
            ("Sarah Jenkins", "CTO, FinVantage Group", 5, 
             "AI-Solutions completely streamlined our data analytics process. Their custom machine learning models reduced our manual processing time by over 40%. Exceptionally professional and forward-thinking team!"),
            ("Marcus Aurelius", "Operations Director, LogiChain", 5, 
             "The automated RPA solution developed by AI-Solutions has transformed our logistics scheduling. We've seen a massive reduction in routing errors and an increase in fleet efficiency. Highly recommended!"),
            ("Elena Rostova", "Head of Digital Experience, RetailCorp", 4, 
             "We integrated their NLP chatbot into our retail platform and the results have been stellar. Customer service response times dropped and conversion rates improved. Excellent customer service and support.")
        ]
        for name, title, rating, fb in default_reviews:
            cursor.execute("""
            INSERT INTO reviews (name, job_title, rating, feedback, status)
            VALUES (?, ?, ?, ?, 'approved')
            """, (name, title, rating, fb))
        conn.commit()
        print("Database seeded: Default approved reviews created.")
        
    conn.close()

# --- INQUIRIES CRUD FUNCTIONS ---

def save_inquiry(data: dict):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO inquiries (name, email, phone, company_name, country, job_title, job_details, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'new')
    """, (
        data.get("name"),
        data.get("email"),
        data.get("phone"),
        data.get("company_name"),
        data.get("country"),
        data.get("job_title"),
        data.get("job_details"),
    ))
    conn.commit()
    conn.close()

def get_all_inquiries():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM inquiries ORDER BY created_at DESC")
    rows = cursor.fetchall()
    inquiries = [dict(row) for row in rows]
    conn.close()
    return inquiries

def delete_inquiry(inquiry_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM inquiries WHERE id = ?", (inquiry_id,))
    conn.commit()
    conn.close()

def mark_inquiry_read(inquiry_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE inquiries SET status = 'read' WHERE id = ?", (inquiry_id,))
    conn.commit()
    conn.close()

def get_inquiry_stats():
    conn = get_db()
    cursor = conn.cursor()
    
    # Total count
    cursor.execute("SELECT COUNT(*) FROM inquiries")
    total_inquiries = cursor.fetchone()[0]
    
    # New inquiries count
    cursor.execute("SELECT COUNT(*) FROM inquiries WHERE status = 'new'")
    new_inquiries = cursor.fetchone()[0]
    
    # Total reviews count
    cursor.execute("SELECT COUNT(*) FROM reviews")
    total_reviews = cursor.fetchone()[0]
    
    # Pending reviews count
    cursor.execute("SELECT COUNT(*) FROM reviews WHERE status = 'pending'")
    pending_reviews = cursor.fetchone()[0]
    
    # Inquiries by country (for charts)
    cursor.execute("SELECT country, COUNT(*) as count FROM inquiries WHERE country IS NOT NULL AND country != '' GROUP BY country LIMIT 5")
    country_stats = [dict(row) for row in cursor.fetchall()]
    
    conn.close()
    return {
        "total_inquiries": total_inquiries,
        "new_inquiries": new_inquiries,
        "total_reviews": total_reviews,
        "pending_reviews": pending_reviews,
        "country_stats": country_stats
    }

# --- REVIEWS CRUD FUNCTIONS ---

def save_review(data: dict):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
    INSERT INTO reviews (name, job_title, rating, feedback, status)
    VALUES (?, ?, ?, ?, 'pending')
    """, (
        data.get("name"),
        data.get("job_title"),
        data.get("rating"),
        data.get("feedback")
    ))
    conn.commit()
    conn.close()

def get_approved_reviews():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM reviews WHERE status = 'approved' ORDER BY created_at DESC")
    rows = cursor.fetchall()
    reviews = [dict(row) for row in rows]
    conn.close()
    return reviews

def get_all_reviews():
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM reviews ORDER BY created_at DESC")
    rows = cursor.fetchall()
    reviews = [dict(row) for row in rows]
    conn.close()
    return reviews

def approve_review(review_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("UPDATE reviews SET status = 'approved' WHERE id = ?", (review_id,))
    conn.commit()
    conn.close()

def delete_review(review_id: int):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("DELETE FROM reviews WHERE id = ?", (review_id,))
    conn.commit()
    conn.close()

# --- ADMIN VERIFICATION ---

def verify_admin(username, password):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT password_hash, salt FROM admins WHERE username = ?", (username,))
    row = cursor.fetchone()
    conn.close()
    if row:
        stored_hash = row["password_hash"]
        salt_hex = row["salt"]
        return verify_password(password, stored_hash, salt_hex)
    return False

if __name__ == "__main__":
    init_db()
    print("Database check completed.")
