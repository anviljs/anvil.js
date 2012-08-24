@IF EXIST "%~dp0\node.exe" (
  "%~dp0\node.exe" "%~dp0\.\anvil.js" %*
) ELSE (
  node "%~dp0\.\anvil.js" %*
)