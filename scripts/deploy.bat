@echo off
:: Deploiement du dashboard sur le VPS : git pull, npm ci, build, redemarrage du service.
::   Double-clic : se relance en administrateur, attend une touche a la fin.
::   deploy.bat --auto : pour SSH (session deja administrateur) ; ni fenetre ni pause,
::                       code de sortie 1 a la premiere erreur.

set "AUTO="
if /i "%~1"=="--auto" set "AUTO=1"

:: Droits administrateur requis par nssm
net session >nul 2>&1
if not errorlevel 1 goto :admin
if defined AUTO (
    echo ERREUR: droits administrateur requis.
    exit /b 1
)
powershell -NoProfile -Command "Start-Process -FilePath '%~f0' -Verb RunAs"
exit /b

:admin
:: git pull peut reecrire ce fichier pendant son execution, ce que cmd supporte mal :
:: on continue depuis une copie dans %TEMP% (lancee sans "call", on n'y revient pas).
if defined DEPLOY_FROM_COPY goto :main
for %%I in ("%~dp0..") do set "APP_DIR=%%~fI"
set "DEPLOY_FROM_COPY=1"
copy /y "%~f0" "%TEMP%\anomaly-dashboard-deploy.bat" >nul
"%TEMP%\anomaly-dashboard-deploy.bat" %*

:main
setlocal
title Deploiement Spare Parts Dashboard
set "SERVICE=anomaly-dashboard"
set "EXIT_CODE=1"

echo ========================================
echo DEPLOIEMENT %date% %time%
echo ========================================

cd /d "%APP_DIR%" || (echo ERREUR: dossier %APP_DIR% introuvable & goto :fin)

echo [1/4] Recuperation du code...
git pull
if errorlevel 1 (echo ERREUR: git pull a echoue & goto :fin)

echo [2/4] Installation des dependances...
call npm ci --no-audit --no-fund
if errorlevel 1 (echo ERREUR: npm ci a echoue & goto :fin)

echo [3/4] Construction du site...
call npm run build
if errorlevel 1 (echo ERREUR: le build a echoue, le service n'est pas redemarre & goto :fin)

echo [4/4] Redemarrage du service...
nssm restart %SERVICE%
if errorlevel 1 (echo ERREUR: le redemarrage du service a echoue & goto :fin)

echo.
echo Deploiement termine.
set "EXIT_CODE=0"

:fin
echo.
if not defined AUTO pause
exit /b %EXIT_CODE%
