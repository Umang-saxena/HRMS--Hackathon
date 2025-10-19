import pymupdf  # modern import name (formerly fitz)
import os

def extract_text_from_pdf(file_path: str) -> str:
    """
    Extracts readable text from a PDF resume using PyMuPDF (layout-aware).
    Automatically skips empty pages and trims extra spaces.

    Args:
        file_path (str): Path to the resume PDF file.

    Returns:
        str: Extracted text content from the PDF.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"File not found: {file_path}")

    text_content = []

    try:
        # Open PDF file
        with pymupdf.open(file_path) as doc:
            for page in doc:
                # "text" mode preserves proper layout (columns, bullets, etc.)
                page_text = page.get_text("text").strip()
                if page_text:
                    text_content.append(page_text)

        return "\n".join(text_content).strip()

    except Exception as e:
        print(f"⚠️ Error extracting text from {file_path}: {e}")
        return ""

if __name__ == "__main__":
    # Simple test/demo
    sample_pdf = "Resume_1 (11).pdf"  # Replace with your sample PDF path
    extracted_text = extract_text_from_pdf(sample_pdf)
    print(f"Extracted Text from {sample_pdf}:\n")
    print(extracted_text[:2000])  # Print first 2000 characters