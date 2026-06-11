@echo off
echo ========================================
echo Student System - Database Setup Script
echo ========================================
echo.

REM Check if PostgreSQL is installed
where psql >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] PostgreSQL is not installed or not in PATH
    echo Please install PostgreSQL first: https://www.postgresql.org/download/
    pause
    exit /b 1
)

echo [1/3] Checking PostgreSQL connection...
psql -U postgres -c "SELECT version();" >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Cannot connect to PostgreSQL
    echo Please make sure PostgreSQL is running and you have the correct password
    pause
    exit /b 1
)

echo [2/3] Creating database 'studentdb'...
psql -U postgres -c "CREATE DATABASE studentdb;" 2>nul
if %ERRORLEVEL% EQU 0 (
    echo [SUCCESS] Database 'studentdb' created successfully!
) else (
    echo [INFO] Database 'studentdb' may already exist
    psql -U postgres -c "\l" | findstr studentdb >nul
    if %ERRORLEVEL% EQU 0 (
        echo [SUCCESS] Database 'studentdb' exists and is ready
    ) else (
        echo [ERROR] Failed to create database
        pause
        exit /b 1
    )
)

echo [3/3] Verifying database...
psql -U postgres -c "\l" | findstr studentdb
if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================
    echo Database setup completed successfully!
    echo ========================================
    echo.
    echo Next steps:
    echo 1. Create backend/.env file with your database credentials
    echo 2. Run: python -m venv .venv
    echo 3. Run: .venv\Scripts\activate
    echo 4. Run: pip install -r backend/requirements.txt
    echo 5. Run: cd backend ^&^& python run.py
    echo.
) else (
    echo [ERROR] Database verification failed
    pause
    exit /b 1
)

pause
