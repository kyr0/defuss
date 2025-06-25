#!/bin/bash

# WebFAQ Data Fetching Script
# This script sets up a Python virtual environment and fetches WebFAQ dataset
# for multiple languages and converts to JSON format.

set -e  # Exit on any error

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_DIR="$SCRIPT_DIR/venv"
OUTPUT_DIR="$SCRIPT_DIR/benchmark_data"

echo "🚀 WebFAQ Data Collection Script"
echo "================================"
echo "Script directory: $SCRIPT_DIR"
echo "Output directory: $OUTPUT_DIR"
echo ""

# Create directories
mkdir -p "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for Python
if ! command_exists python3; then
    echo "❌ Error: Python 3 is required but not installed."
    exit 1
fi

echo "✅ Python 3 found: $(python3 --version)"

# Create and activate virtual environment
echo "📦 Setting up virtual environment..."
if [ ! -d "$VENV_DIR" ]; then
    python3 -m venv "$VENV_DIR"
    echo "✅ Virtual environment created at $VENV_DIR"
else
    echo "✅ Virtual environment already exists at $VENV_DIR"
fi

# Activate virtual environment
source "$VENV_DIR/bin/activate"
echo "✅ Virtual environment activated"

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install required packages
echo "📥 Installing Python dependencies..."
if [ -f "$SCRIPT_DIR/requirements.txt" ]; then
    pip install -r "$SCRIPT_DIR/requirements.txt"
else
    pip install datasets huggingface_hub mteb
    pip freeze > "$SCRIPT_DIR/requirements.txt"
fi

echo "✅ Dependencies installed successfully"

# Check if the Python data fetcher exists
if [ ! -f "$SCRIPT_DIR/download.py" ]; then
    echo "❌ Error: download.py not found!"
    echo "Please ensure download.py is in the same directory as this script."
    exit 1
fi

echo "✅ Python data fetcher found: download.py"

# Run the data fetching
echo ""
echo "🌍 Starting WebFAQ data collection..."
echo "This may take a while depending on your internet connection..."
echo ""

python3 "$SCRIPT_DIR/download.py"

# Check results
echo ""
echo "📊 Collection Results:"
echo "===================="

if [ -d "$OUTPUT_DIR" ]; then
    echo "📁 Output directory: $OUTPUT_DIR"
    echo "📄 Generated files:"
    ls -la "$OUTPUT_DIR"/*.json 2>/dev/null || echo "No JSON files found"
    
    # Count total files and estimate size
    json_count=$(ls "$OUTPUT_DIR"/*.json 2>/dev/null | wc -l || echo 0)
    echo "📈 Total JSON files: $json_count"
    
    if [ "$json_count" -gt 0 ]; then
        echo "💾 Total size:"
        du -sh "$OUTPUT_DIR"
    fi
else
    echo "❌ Output directory not found"
fi

echo ""
echo "🎉 WebFAQ data collection completed!"
echo "You can find the benchmark data in: $OUTPUT_DIR"
echo ""
echo "File format:"
echo "- {lang}_documents.json: Document corpus"
echo "- {lang}_queries.json: Search queries"  
echo "- {lang}_qrels.json: Relevance judgments"
echo ""
echo "To deactivate the virtual environment, run: deactivate"
