const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

// Insert Turnstile into all forms where missing in login block
const tStr = `<Turnstile siteKey="0x4AAAAAAD0Yhl8ycnaCVDbt" onSuccess={setTurnstileToken} ref={turnstileRef} />`;

code = code.replace(
  /{authMode === 'login' \? 'Sign in to dashboard' : 'Create account'}/g,
  `{authMode === 'login' ? 'Sign in to dashboard' : 'Create account'}
                </button>
                <div className="mt-4 flex justify-center">
                  <Turnstile siteKey="0x4AAAAAAD0Yhl8ycnaCVDbt" onSuccess={setTurnstileToken} ref={turnstileRef} />
                </div>`
);
code = code.replace(
  `Verify Email\n                </button>`,
  `Verify Email
                </button>
                <div className="mt-4 flex justify-center">
                  <Turnstile siteKey="0x4AAAAAAD0Yhl8ycnaCVDbt" onSuccess={setTurnstileToken} ref={turnstileRef} />
                </div>`
);
code = code.replace(
  `Send reset link\n                </button>`,
  `Send reset link
                </button>
                <div className="mt-4 flex justify-center">
                  <Turnstile siteKey="0x4AAAAAAD0Yhl8ycnaCVDbt" onSuccess={setTurnstileToken} ref={turnstileRef} />
                </div>`
);
code = code.replace(
  `Update password\n                </button>`,
  `Update password
                </button>
                <div className="mt-4 flex justify-center">
                  <Turnstile siteKey="0x4AAAAAAD0Yhl8ycnaCVDbt" onSuccess={setTurnstileToken} ref={turnstileRef} />
                </div>`
);

// wait we need to remove the first </button> from the replacement
code = code.replace(
  `{authMode === 'login' ? 'Sign in to dashboard' : 'Create account'}\n                </button>\n                <div className="mt-4 flex justify-center">\n                  <Turnstile siteKey="0x4AAAAAAD0Yhl8ycnaCVDbt" onSuccess={setTurnstileToken} ref={turnstileRef} />\n                </div>\n                </button>`,
  `{authMode === 'login' ? 'Sign in to dashboard' : 'Create account'}\n                </button>\n                <div className="mt-4 flex justify-center">\n                  <Turnstile siteKey="0x4AAAAAAD0Yhl8ycnaCVDbt" onSuccess={setTurnstileToken} ref={turnstileRef} />\n                </div>`
);

fs.writeFileSync('src/App.tsx', code);
