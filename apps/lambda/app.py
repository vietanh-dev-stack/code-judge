import json
import subprocess
import os
import shutil
import time

def handler(event, context):
    code = event.get('code')
    language = event.get('language', '').lower()
    test_cases = event.get('testCases', [])
    time_limit = event.get('timeLimit', 2000) / 1000.0 # convert to seconds
    
    temp_dir = "/tmp/judge"
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
    os.makedirs(temp_dir)
    
    file_name = "solution.py" if language == "python" else "solution.cpp"
    if language == "javascript": file_name = "solution.js"
    if language == "java": file_name = "Main.java"
    
    code_path = os.path.join(temp_dir, file_name)
    with open(code_path, "w") as f:
        f.write(code)
        
    results = []
    compile_error = None
    
    # 1. Compilation
    if language == "cpp":
        compile_res = subprocess.run(
            ["g++", code_path, "-o", os.path.join(temp_dir, "solution")],
            capture_output=True, text=True
        )
        if compile_res.returncode != 0:
            return {"compileError": compile_res.stderr}
    elif language == "java":
        compile_res = subprocess.run(
            ["javac", code_path],
            capture_output=True, text=True
        )
        if compile_res.returncode != 0:
            return {"compileError": compile_res.stderr}

    # 2. Execution
    for i, tc in enumerate(test_cases):
        input_data = tc.get('input', '')
        
        run_cmd = []
        if language == "python": run_cmd = ["python3", code_path]
        elif language == "cpp": run_cmd = [os.path.join(temp_dir, "solution")]
        elif language == "javascript": run_cmd = ["node", code_path]
        elif language == "java": run_cmd = ["java", "-cp", temp_dir, "Main"]
        
        start_time = time.time()
        try:
            proc = subprocess.run(
                run_cmd,
                input=input_data,
                capture_output=True,
                text=True,
                timeout=time_limit
            )
            elapsed_time = int((time.time() - start_time) * 1000)
            
            if proc.returncode != 0:
                results.append({"status": "RUNTIME_ERROR", "output": proc.stderr, "time": elapsed_time, "memory": 0})
            else:
                results.append({"status": "ACCEPTED", "output": proc.stdout, "time": elapsed_time, "memory": 0})
                
        except subprocess.TimeoutExpired:
            results.append({"status": "TIME_LIMIT_EXCEEDED", "output": "", "time": int(time_limit * 1000), "memory": 0})
            
    return {"results": results}
