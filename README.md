# ✈️ SDM KMS (SESAR Deployment Manager Knowledge Management System)

**SDM KMS** is a professional-grade AI companion designed for the SESAR Deployment Manager to assist in policy drafting, risk analysis, and complex document rationalization. 

Powered by **Google's Gemini 2.5 Flash**, it acts as a secure, local-first intelligence layer that transforms raw documentation into actionable structured data, knowledge graphs, and strategic outputs.

---

## ✨ Key Capabilities
<img width="700" height="400" alt="Screenshot 2025-12-04 143913" src="https://github.com/user-attachments/assets/9e49f6bd-a16b-4e7e-ba32-4af3e5c35a7c" />

### 📚 Document Knowledge Base (Ingestion Engine)
*   **Multi-Format Support:** Ingests PDF, DOCX, XLSX, PPTX, and text/code files.
*   **AI Rationalization:** Automatically processes documents to extract:
    *   **Summaries**
    *   **Risks** (categorized via PESTLE: Political, Economic, Social, Technological, Legal, Environmental).
    *   **Key Concepts** & Entities.
*   **Chunking Strategy:** Handles large documents by splitting them into manageable tokens for the LLM.

### 🔮 What-If Engine (Contextual Chat)
*   **Scenario Simulation:** Ask complex "What if" questions against your uploaded library.
*   **Citations:** The AI uses the specific content of your uploaded files as its primary source of truth.

### 🧠 Concept Wiki (Knowledge Graph)
*   **Dynamic Ontology:** Builds a navigable graph of concepts and definitions derived from your documents.
*   **Expert Notes:** Allows human experts to add Markdown-formatted context to AI-generated nodes.
*   **File Attachment:** Link specific documents to specific concept nodes for granular context.
*   **Graph Reorganization:** AI-assisted parent suggestion and manual node moving to structure knowledge effectively.

### ⚠️ Risk Register & Gap Analysis
*   **5x5 Matrix Generation:** Automatically drafts a standard risk matrix (Probability vs. Impact) based on project documentation.
*   **Blind Spot Detection:** An AI "Gap Analysis" pass identifies risks that *should* be in your documents but are missing.
*   **Bulk Review:** Review risks extracted from individual files and import them into the master register.

### 📝 Strategic Tools
*   **Scaffolded Reporter:** Generates structured executive reports with tailored depth, audience, and tone.
*   **Email Composer:** drafts communication with fine-grained control over "Power Dynamics," "Directness," and "Cultural Context."

---

## 🛡️ Safety & Ethics

This tool is designed for a **safety-critical domain** (Aviation).
*   **Guidance Tab:** Includes a built-in Ethical Use Guide emphasizing that AI supports—but never replaces—professional judgement.
*   **Local Processing:** The app runs client-side (files are processed in the browser before being sent to the Gemini API). State is stored in memory or exported to JSON, not a central database.

---

## ⚙️ Tech Stack

*   **Frontend:** React 19, Tailwind CSS
*   **AI Model:** Google Gemini 2.5 Flash (`@google/genai` SDK)
*   **Document Parsing:** 
    *   `mammoth.js` (Word)
    *   `SheetJS / xlsx` (Excel)
    *   `JSZip` (PowerPoint/XML parsing)
*   **UI/UX:** Custom "Glassmorphism" dark mode interface designed for data-heavy workflows.

---

## 🚀 Setup & Installation

### Prerequisites
1.  **Google AI Studio API Key:** You must have a valid API key from [Google AI Studio](https://aistudiocdn.com/google-ai-studio).

### Running the App
1.  **Clone the repository**
2.  **Install dependencies** (`npm install`)
3.  **Set Environment Variable**:
    Ensure `process.env.API_KEY` is available to the build environment.
    *   Create a `.env` file: `API_KEY=your_key_here`
4.  **Run Development Server**:
    ```bash
    npm run dev
    ```

---

## 💾 Data Management

*   **Export/Import:** The entire application state (ingested files, analysis, wiki graph, risk register) can be exported to a single JSON file for session persistence or sharing between analysts.
*   **No Backend:** There is no server-side database. Refreshing the page clears the state unless you export your session.

---

**Disclaimer:** This tool assists in policy analysis but does not constitute legal or regulatory advice. All outputs must be verified by qualified SESAR Deployment Manager personnel.
