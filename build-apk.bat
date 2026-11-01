@echo off
set "JAVA_HOME=C:\Users\Seven Studio PC\AppData\Local\Programs\jdk-17\jdk-17.0.12+7"
set "PATH=%JAVA_HOME%\bin;C:\Users\Seven Studio PC\AppData\Local\Android\Sdk\build-tools\35.0.0;%PATH%"
set "ANDROID_HOME=C:\Users\Seven Studio PC\AppData\Local\Android\Sdk"

echo ========================================================
echo   BUILDING ANDROID RELEASE APK - LIGHTROOM AI ANALYZER
echo ========================================================

cd android
call gradlew.bat assembleRelease --no-daemon
cd ..

if not exist release mkdir release
if exist "C:\tmp\lrai_b\app\outputs\apk\release\app-release.apk" (
    copy /Y "C:\tmp\lrai_b\app\outputs\apk\release\app-release.apk" "release\Lightroom-AI-Analyzer-Release.apk"
    copy /Y "C:\tmp\lrai_b\app\outputs\apk\release\app-release.apk" "release\Lightroom-AI-Analyzer-V1.0.apk"
    copy /Y "C:\tmp\lrai_b\app\outputs\apk\release\app-release.apk" "dist\Lightroom-AI-Analyzer-Release.apk"
    copy /Y "C:\tmp\lrai_b\app\outputs\apk\release\app-release.apk" "public\Lightroom-AI-Analyzer-Release.apk"
    echo ========================================================
    echo   APK RELEASE BUILD SUCCESS!
    echo   Output: release\Lightroom-AI-Analyzer-Release.apk
    echo ========================================================
) else if exist "android\build_out\app\outputs\apk\release\app-release.apk" (
    copy /Y "android\build_out\app\outputs\apk\release\app-release.apk" "release\Lightroom-AI-Analyzer-Release.apk"
    copy /Y "android\build_out\app\outputs\apk\release\app-release.apk" "dist\Lightroom-AI-Analyzer-Release.apk"
    copy /Y "android\build_out\app\outputs\apk\release\app-release.apk" "public\Lightroom-AI-Analyzer-Release.apk"
    echo ========================================================
    echo   APK RELEASE BUILD SUCCESS!
    echo   Output: release\Lightroom-AI-Analyzer-Release.apk
    echo ========================================================
) else (
    echo ========================================================
    echo   BUILD FAILED: app-release.apk not found.
    echo ========================================================
)
