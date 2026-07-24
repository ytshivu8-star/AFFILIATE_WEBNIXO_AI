const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

code = code.replace(
  'const isCustomKey = rawApiKey !== "re_KANKrYPv_NCYbaoLUnEauu2TbhyCnnMKj" && rawApiKey.length > 10;',
  'const isCustomKey = rawApiKey.length > 10;'
);

code = code.replace(
  '    } else if (rawApiKey !== "re_KANKrYPv_NCYbaoLUnEauu2TbhyCnnMKj") {',
  '    } else if (rawApiKey && rawApiKey.length > 10) {'
);

fs.writeFileSync('server.ts', code);
console.log('patched');
