'use strict';

for (const form of document.querySelectorAll('[data-quiz]')) {
  const feedback = form.querySelector('[data-feedback]');
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const answer = form.querySelector('input[name="answer"]:checked');
    if (!answer) {
      feedback.textContent = '先选一个答案；不记得也可以选“我不确定”。';
      feedback.dataset.state = 'empty';
      return;
    }
    feedback.textContent = answer.dataset.explanation;
    feedback.dataset.state = answer.value === 'unsure'
      ? 'unsure'
      : answer.dataset.correct === 'true' ? 'correct' : 'retry';
  });
  form.addEventListener('change', () => {
    feedback.textContent = '';
    delete feedback.dataset.state;
  });
}
