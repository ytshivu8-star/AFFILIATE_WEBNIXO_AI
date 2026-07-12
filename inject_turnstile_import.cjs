const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(`import React, { useState, useEffect } from 'react';`, 
`import React, { useState, useEffect, useRef } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import type { TurnstileInstance } from '@marsidev/react-turnstile';`);

const stateVars = `  const [verificationMode, setVerificationMode] = useState<VerificationMode>(null);`;
const turnstileVars = `  const [turnstileToken, setTurnstileToken] = useState<string>('');
  const turnstileRef = useRef<TurnstileInstance>(null);

  const resetTurnstile = () => {
    setTurnstileToken('');
    if (turnstileRef.current) {
      turnstileRef.current.reset();
    }
  };`;
code = code.replace(stateVars, stateVars + '\n' + turnstileVars);

fs.writeFileSync('src/App.tsx', code);
