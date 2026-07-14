# Edgy

Edgy is a personal project designed to revolutionize how you organize, study, and interact with your learning materials. With Edgy, you can create custom sections, upload files, generate flashcards, enable spaced repetition, and even ask questions about your content—all in one place.

## Features

### 1. Section-Based Organization
- **Create Sections:** Organize your content by creating unique sections (e.g., Math, History, Programming).
- **Upload Files:** Upload files (PDFs, docs, etc.) to any section at any time for flexible organization.

### 2. Smart PDF Info Extraction
- **PDF Parsing:** When you upload a PDF to a section, Edgy extracts and summarizes key information.
- **Pinecone Integration:** All extracted info is saved to Pinecone for efficient semantic search and retrieval within each section.

### 3. Flashcard Generation
- **Automated Flashcards:** Flashcards are automatically generated from the content of files uploaded to each section.
- **Continuous Updates:** As more files are added, the flashcard set grows and evolves.

### 4. Spaced Repetition
- **Intelligent Review:** Flashcards support spaced repetition, helping you review material at optimal intervals to boost retention.

### 5. Ask Section
- **Question & Answer:** Each section has an "Ask" feature where you can ask questions about the uploaded files.
- **Contextual Answers:** Responses are generated based on the content stored in Pinecone, ensuring accurate and relevant answers.

## How It Works

1. **Create a Section:** Start by making a new section for your subject or topic.
2. **Upload Files:** Add PDFs or other files relevant to your section.
3. **Info Extraction:** Edgy parses and stores summary info from PDFs in Pinecone for semantic search.
4. **Flashcard Generation:** Flashcards are created from the contents of your files, and you can begin practicing them.
5. **Spaced Repetition:** Review flashcards using spaced repetition algorithms for effective learning.
6. **Ask Questions:** Use the Ask feature to query information about your uploaded files and get instant, content-based answers.

## Example Workflow

1. **Create section:** "Biology"
2. **Upload PDFs:** Add lecture notes, textbook chapters, or research papers.
3. **Flashcards:** Edgy automatically creates flashcards like "What is mitosis?" from your files.
4. **Spaced repetition:** Practice daily for long-term retention.
5. **Ask:** "Explain the process of cellular respiration." Get an answer based on your uploaded PDFs.

---

# Edgy-Backend

A Node.js backend for Edgy, designed to manage users, sections, flashcards, and file uploads. The backend provides RESTful APIs for user authentication, section management, flashcard generation and review, and integrates with Pinecone for fast, scalable vector search.

## Backend Features

- **User Authentication**: Secure sign-up, login, logout, and user profile endpoints. OTP verification via email supported.
- **Section Management**: Create, retrieve, and delete sections. Each section can have a title, description, and associated files.
- **Flashcards**: Generate flashcards from uploaded content using generative AI (Groq), review flashcards, and update flashcard status (spaced repetition features included).
- **File Upload**: Upload files, extract content, and automatically generate Q&A pairs as flashcards.
- **Vector Search (Pinecone)**: Search flashcards in sections using Pinecone vector database for semantic retrieval.
- **Robust Error Handling**: Centralized error management and informative API responses.
- **Security**: Uses Helmet, CORS, and environment variables for security and configuration.

## Tech Stack

- **Node.js** / **Express.js**
- **MongoDB** (Mongoose)
- **Pinecone** (Vector database)
- **Generative AI** (Groq AI for Q&A extraction)
- **JWT** authentication
- **Email** (OTP delivery via SendinBlue API)
- **Docker-ready** (can be containerized easily)

## API Endpoints

### User Routes (`/api/user`)
- `POST /signup/initiate` — Initiate signup, send OTP.
- `POST /signup/verify-otp` — Verify OTP.
- `POST /signup/save-user` — Save user after OTP verification.
- `POST /login` — User login.
- `GET /getProfile` — Get authenticated user's profile.
- `POST /logout` — Logout.

### Section Routes (`/api/section`)
- `POST /add-section` — Create a new section.
- `GET /get-sections` — List all sections for user.
- `DELETE /delete-section/:id` — Delete section by ID (also deletes flashcards and Pinecone vectors).

### FlashCard Routes (`/api/flashcards`)
- `POST /review` — Review flashcards.
- `POST /swipeCard` — Update flashcard status.
- `POST /update` — Update next review time.

### Upload Routes (`/api/upload`)
- Upload files, extract text, create Q&A pairs, generate flashcards, and upsert Pinecone vectors.

## Models

- **User**: User authentication and profile.
- **SignUp**: Temp model for OTP and signup flow.
- **Section**: User sections with title, description, files.
- **FlashCard**: Q&A items with spaced repetition fields.

## Setup

1. **Clone the repo:**
   ```bash
   git clone https://github.com/anuragk0/Edgy-Backend.git
   cd Edgy-Backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment:**
   - Copy `.env.example` to `.env` and set your values (MongoDB URI, JWT secret, Pinecone API key, email API keys, etc.).

4. **Run MongoDB** (locally or via cloud).

5. **Start the server:**
   ```bash
   npm start
   ```

## Environment Variables

- `MONGO_URI` — MongoDB connection string
- `JWT_SECRET` — JWT secret key
- `PINECONE_API_KEY` — Pinecone API key
- `CORS_ORIGIN` — Allowed CORS origin (default: http://localhost:5173)
- Email API keys, Groq API keys, etc.

---

## Links

- **Frontend:** [Edgy Frontend](https://github.com/anuragk0/Edgy_Frontend)

---

**Happy Coding! 🚀**
