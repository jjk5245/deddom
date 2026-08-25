import { analyzeCode } from './dedupe.mjs';

// const code = `<><hello a={b}><z></z><world></world></hello><a><b><d></d></b><c></c></a></>`;
const code = `import React from 'react';

import { ChatBox } from './ChatBox';

// 1. Define the component with a clear name
const AI = () => (
  <>
        <div style={{margin: 'auto'}}>
            <p>Control the servitor app with an LLM...</p>
            <ChatBox />
        </div>
        <div style={{margin: 'auto'}}>
            <p>Control the servitor app with an LLM...</p>
            <ChatBox />
        </div>
        </>
    );

// 2. Export it cleanly
export default AI;
`;

analyzeCode(code);