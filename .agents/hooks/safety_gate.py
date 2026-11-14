#!/usr/bin/env python3
"""
Antigravity PreToolUse Safety Gate Hook for Figvibe Backend.
Enforces human approval before:
1. Destructive database operations
2. Dependency or package manager modifications
3. Production deployments or remote releases
"""

import sys
import json
import re

DESTRUCTIVE_DB_PATTERNS = [
    r"prisma\s+migrate\s+reset",
    r"prisma\s+db\s+push\s+.*--force-reset",
    r"prisma\s+migrate\s+dev\s+.*--skip-seed",
    r"drop\s+table",
    r"drop\s+database",
    r"truncate\s+table",
    r"alter\s+table\s+.*drop\s+column",
]

DEPENDENCY_CHANGE_PATTERNS = [
    r"npm\s+(i|install|uninstall|remove|update)\b",
    r"bun\s+(add|remove|install|update)\b",
    r"pnpm\s+(add|remove|install|update)\b",
    r"yarn\s+(add|remove|install|upgrade)\b",
]

PRODUCTION_DEPLOY_PATTERNS = [
    r"docker\s+push\b",
    r"kubectl\s+(apply|delete|create|replace)\b",
    r"git\s+push\s+.*(main|master|prod|production)\b",
    r"npm\s+publish\b",
]

def evaluate_command(cmd: str):
    cmd_lower = cmd.strip().lower()
    
    for pattern in DESTRUCTIVE_DB_PATTERNS:
        if re.search(pattern, cmd_lower):
            return (
                "force_ask",
                f"Destructive database operation detected ('{cmd}'). Explicit human approval is required.",
            )
            
    for pattern in DEPENDENCY_CHANGE_PATTERNS:
        if re.search(pattern, cmd_lower):
            return (
                "force_ask",
                f"Dependency modification detected ('{cmd}'). Explicit human approval is required.",
            )
            
    for pattern in PRODUCTION_DEPLOY_PATTERNS:
        if re.search(pattern, cmd_lower):
            return (
                "force_ask",
                f"Production deployment action detected ('{cmd}'). Explicit human approval is required.",
            )
            
    return ("allow", None)

def main():
    try:
        raw_input = sys.stdin.read()
        if not raw_input:
            print(json.dumps({"decision": "allow"}))
            return
            
        data = json.loads(raw_input)
        tool_call = data.get("toolCall", {})
        tool_name = tool_call.get("name", "")
        args = tool_call.get("args", {})
        
        if tool_name == "run_command":
            cmd = args.get("CommandLine", "")
            decision, reason = evaluate_command(cmd)
            
            output = {"decision": decision}
            if reason:
                output["reason"] = reason
            print(json.dumps(output))
            return
            
        print(json.dumps({"decision": "allow"}))
    except Exception as e:
        # Fallback to safe ask on hook error
        print(json.dumps({
            "decision": "ask",
            "reason": f"Safety gate internal check error: {str(e)}"
        }))

if __name__ == "__main__":
    main()
