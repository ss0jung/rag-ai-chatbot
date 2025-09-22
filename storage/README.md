# Storage Directory Structure

This directory contains shared data storage between the Java backend service and AI service for the RAG AI Chatbot system.

## Current Directory Structure

```
storage/
├── data/
│   ├── uploaded/       # Original data uploaded by Java backend
│   ├── processed/      # Data processed by AI service
│   └── temp/           # Temporary files during processing
├── vectorstore/        # Vector embeddings and indices
└── README.md           # This documentation
```

## Usage Flow

1. **Java Backend**: Uploads files to `data/uploaded/` directory
2. **AI Service**: 
   - Monitors `data/uploaded/` for new files
   - Processes files and saves results to `data/processed/`
   - Creates vector embeddings and stores in `vectorstore/`
   - Uses `data/temp/` for intermediate processing

## Supported Data Types

- **Documents**: PDF, DOCX, TXT, MD
- **Structured Data**: CSV, JSON, XML
- **Web Data**: Crawled web pages, HTML
- **Media**: Images with OCR processing capability

## File Naming Convention

- **Uploaded files**: `{timestamp}_{original_filename}`
- **Processed files**: `{document_id}_processed.json`
- **Vector stores**: `{data_id}_vectors.faiss`

## Environment Variables

Configure the following in your `.env` file:

```
STORAGE_BASE_DIR=../storage
DATA_UPLOADED_DIR=../storage/data/uploaded
DATA_PROCESSED_DIR=../storage/data/processed
VECTORSTORE_DIR=../storage/vectorstore
TEMP_DIR=../storage/data/temp
```

## Permissions

Ensure both Java and Python services have read/write access to this directory.

## Backup Strategy

- Regular backups of `uploaded/` and `vectorstore/` directories
- `temp/` and `processed/chunks/` can be regenerated if needed