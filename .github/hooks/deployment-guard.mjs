import process from 'node:process';

const COMMAND_TOOL_NAMES = [
  /run_in_terminal/i,
  /create_and_run_task/i,
  /run_vscode_command/i,
];

const COMMAND_KEYS = new Set(['command', 'args']);

function readStdin() {
  return new Promise((resolve) => {
    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => resolve(data));
    process.stdin.resume();
  });
}

function findFirstStringByKey(value, keys) {
  if (!value || typeof value !== 'object') {
    return null;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findFirstStringByKey(item, keys);
      if (found) {
        return found;
      }
    }
    return null;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (keys.has(key) && typeof nestedValue === 'string' && nestedValue.trim()) {
      return nestedValue.trim();
    }
    const found = findFirstStringByKey(nestedValue, keys);
    if (found) {
      return found;
    }
  }

  return null;
}

function collectCommandStrings(value, output = []) {
  if (!value || typeof value !== 'object') {
    return output;
  }

  if (Array.isArray(value)) {
    for (const item of value) {
      collectCommandStrings(item, output);
    }
    return output;
  }

  for (const [key, nestedValue] of Object.entries(value)) {
    if (COMMAND_KEYS.has(key)) {
      if (typeof nestedValue === 'string' && nestedValue.trim()) {
        output.push(nestedValue.trim());
      } else if (Array.isArray(nestedValue)) {
        const flattened = nestedValue
          .filter((item) => typeof item === 'string' && item.trim())
          .map((item) => item.trim())
          .join(' ');
        if (flattened) {
          output.push(flattened);
        }
      }
    }
    collectCommandStrings(nestedValue, output);
  }

  return output;
}

function buildResponse(decision, reason, systemMessage) {
  const response = {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: decision,
      permissionDecisionReason: reason,
    },
  };

  if (systemMessage) {
    response.systemMessage = systemMessage;
  }

  return response;
}

function hasViolation(commandText) {
  const violations = [];

  if (/\bscp\b/i.test(commandText)) {
    violations.push('manual scp usage');
  }

  if (/\bpm2\s+restart\s+(?:\d+\b(?:\s+\d+\b)*)/i.test(commandText)) {
    violations.push('pm2 restart by numeric id');
  }

  const port3000Patterns = [
    /(?:^|\s)(?:--port|-p)\s*=?\s*3000\b/i,
    /\bPORT\s*=\s*3000\b/i,
    /\blocalhost:3000\b/i,
    /\b127\.0\.0\.1:3000\b/i,
    /\bhttps?:\/\/[^\s]+:3000\b/i,
    /\bport\s+3000\b/i,
    /(?:^|\s)3000:3000\b/i,
  ];

  if (port3000Patterns.some((pattern) => pattern.test(commandText))) {
    violations.push('port 3000 usage');
  }

  return violations;
}

const rawInput = await readStdin();

let payload = {};

try {
  payload = rawInput.trim() ? JSON.parse(rawInput) : {};
} catch {
  payload = {};
}

const toolName = findFirstStringByKey(payload, new Set(['toolName', 'tool_name', 'tool', 'recipient_name', 'recipientName']));
const commandStrings = collectCommandStrings(payload);

const shouldInspect = !toolName || COMMAND_TOOL_NAMES.some((pattern) => pattern.test(toolName));

if (!shouldInspect || commandStrings.length === 0) {
  console.log(JSON.stringify(buildResponse('allow', 'No guarded command detected.'), null, 2));
  process.exit(0);
}

const commandText = commandStrings.join('\n');
const violations = hasViolation(commandText);

if (violations.length > 0) {
  const reason = `Blocked by Raven deployment guard: ${violations.join(', ')}.`;
  const systemMessage = 'Raven policy blocks manual scp, pm2 restart by numeric id, and any command that uses port 3000. Use scripts/deploy-to-prod.ps1 and ports 4010, 4011, or 4012 instead.';
  console.log(JSON.stringify(buildResponse('deny', reason, systemMessage), null, 2));
  process.exit(0);
}

console.log(JSON.stringify(buildResponse('allow', 'Command passed Raven deployment guard.'), null, 2));