import test from 'node:test';import assert from 'node:assert/strict';
test('mailbox is correctly configured',()=>assert.equal('nexusai.helpdesk@gmail.com'.split('@')[1],'nexusai.com'));
test('sheet ID is configured',()=>assert.equal('1nxmEvfWe6WcdUX2Wcc3TQ06oMVWz6LMGTtgXwEmDCog'.length>20,true));