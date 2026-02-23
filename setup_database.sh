#!/bin/bash

echo "========================================"
echo "Student System - Database Setup Script"
echo "========================================"
echo ""

# Check if PostgreSQL is installed
if ! command -v psql &> /dev/null; then
    echo "[ERROR] PostgreSQL is not installed or not in PATH"
    echo "Please install PostgreSQL first"
    exit 1
fi

echo "[1/3] Checking PostgreSQL connection..."
if ! psql -U postgres -c "SELECT version();" &> /dev/null; then
    echo "[ERROR] Cannot connect to PostgreSQL"
    echo "Please make sure PostgreSQL is running and you have the correct password"
    exit 1
fi

echo "[2/3] Creating database 'studentdb'..."
if psql -U postgres -c "CREATE DATABASE studentdb;" 2>/dev/null; then
    echo "[SUCCESS] Database 'studentdb' created successfully!"
else
    echo "[INFO] Database 'studentdb' may already exist"
    if psql -U postgres -c "\l" | grep -q studentdb; then
        echo "[SUCCESS] Database 'studentdb' exists and is ready"
    else
        echo "[ERROR] Failed to create database"
        exit 1
    fi
fi

echo "[3/3] Verifying database..."
if psql -U postgres -c "\l" | grep -q studentdb; then
    echo ""
    echo "========================================"
    echo "Database setup completed successfully!"
    echo "========================================"
    echo ""
    echo "Next steps:"
    echo "1. Create backend/.env file with your database credentials"
    echo "2. Run: python -m venv .venv"
    echo "3. Run: source .venv/bin/activate"
    echo "4. Run: pip install -r backend/requirements.txt"
    echo "5. Run: cd backend && python run.py"
    echo ""
else
    echo "[ERROR] Database verification failed"
    exit 1
fi
