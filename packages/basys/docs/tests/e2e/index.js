import {Selector} from 'testcafe';

fixture('Index page').page('http://localhost:8080'); // BUG: retrieve url from configs

test('Default tests', async t => {
  await t
    .expect(Selector('header.header').exists)
    .ok()
    .click('.new-todo')
    .pressKey('B u y space m i l k enter')
    .expect(Selector('.todo label').innerText)
    .contains('Buy milk');
});
