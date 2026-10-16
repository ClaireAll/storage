import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

const script = new URL('../assets/lesson.js', import.meta.url);

// Removing a submit branch or keeping stale feedback must fail these checks.
function fixture(answer = null) {
  const feedback = { textContent: '', dataset: {} };
  const handlers = {};
  const form = {
    querySelector(selector) {
      if (selector === '[data-feedback]') return feedback;
      if (selector === 'input[name="answer"]:checked') return answer;
      throw new Error(`Unexpected selector: ${selector}`);
    },
    addEventListener(type, handler) { handlers[type] = handler; },
  };
  const document = { querySelectorAll: () => [form] };
  const source = fs.existsSync(script) ? fs.readFileSync(script, 'utf8') : '';
  vm.runInNewContext(source, { document });
  return {
    feedback,
    submit() {
      assert.equal(typeof handlers.submit, 'function', 'quiz must handle answers');
      let prevented = false;
      handlers.submit({ preventDefault() { prevented = true; } });
      assert.equal(prevented, true, 'answering must not navigate or submit data');
    },
    change() { handlers.change(); },
  };
}

test('an unanswered quiz asks for a choice without claiming correctness', () => {
  const quiz = fixture();
  quiz.submit();
  assert.equal(quiz.feedback.dataset.state, 'empty');
  assert.match(quiz.feedback.textContent, /选|不确定/);
});

test('a correct choice receives its own explanation', () => {
  const quiz = fixture({ value: 'b', dataset: { correct: 'true', explanation: 'B 不会收到 A 的文件。' } });
  quiz.submit();
  assert.equal(quiz.feedback.dataset.state, 'correct');
  assert.equal(quiz.feedback.textContent, 'B 不会收到 A 的文件。');
});

test('a wrong choice gives corrective feedback rather than a success state', () => {
  const quiz = fixture({ value: 'a', dataset: { explanation: '修改属于 A 自己的可写层。' } });
  quiz.submit();
  assert.equal(quiz.feedback.dataset.state, 'retry');
  assert.equal(quiz.feedback.textContent, '修改属于 A 自己的可写层。');
});

test('not remembering is not graded as correct or wrong', () => {
  const quiz = fixture({ value: 'unsure', dataset: { explanation: '先看下面的例子即可。' } });
  quiz.submit();
  assert.equal(quiz.feedback.dataset.state, 'unsure');
  assert.equal(quiz.feedback.textContent, '先看下面的例子即可。');
});

test('changing an answer clears feedback from the previous choice', () => {
  const quiz = fixture({ value: 'b', dataset: { correct: 'true', explanation: '已反馈。' } });
  quiz.submit();
  quiz.change();
  assert.equal(quiz.feedback.textContent, '');
  assert.equal(quiz.feedback.dataset.state, undefined);
});
