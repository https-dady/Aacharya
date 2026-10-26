import { useState } from 'react';
import { Link } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

const QUESTION_TYPES = [
  { value: 'mcq', label: 'Multiple Choice (Single Answer)' },
  { value: 'multiple-select', label: 'Multiple Choice (Multiple Answers)' },
  { value: 'true-false', label: 'True / False' },
  { value: 'short-answer', label: 'Short Answer' },
];

const INITIAL_QUESTION = {
  id: '',
  type: 'mcq',
  text: '',
  marks: '1',
  options: [
    { id: 'a', text: '' },
    { id: 'b', text: '' },
    { id: 'c', text: '' },
    { id: 'd', text: '' },
  ],
  correctAnswer: '',
  correctAnswers: [],
  explanation: '',
};

function createQuestion() {
  return {
    ...INITIAL_QUESTION,
    id: crypto.randomUUID(),
    options: INITIAL_QUESTION.options.map((option) => ({
      ...option,
    })),
    correctAnswers: [],
  };
}

function getQuestionTypeLabel(type) {
  return (
    QUESTION_TYPES.find((item) => item.value === type)?.label ??
    'Unknown question type'
  );
}

export default function FacultyQuizQuestions() {
  const [questions, setQuestions] = useState([]);
  const [activeQuestionId, setActiveQuestionId] = useState(null);
  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState('');

  const activeQuestion =
    questions.find((question) => question.id === activeQuestionId) ??
    null;

  const totalMarks = questions.reduce((total, question) => {
    const marks = Number(question.marks);

    return total + (
      Number.isFinite(marks) && marks > 0 ? marks : 0
    );
  }, 0);

  function addQuestion() {
    const question = createQuestion();

    setQuestions((current) => [...current, question]);
    setActiveQuestionId(question.id);
    setErrors({});
    setNotice('');
  }

  function updateQuestion(questionId, updates) {
    setQuestions((current) =>
      current.map((question) =>
        question.id === questionId
          ? { ...question, ...updates }
          : question,
      ),
    );

    setErrors({});
    setNotice('');
  }

  function updateOption(questionId, optionId, text) {
    setQuestions((current) =>
      current.map((question) => {
        if (question.id !== questionId) {
          return question;
        }

        return {
          ...question,
          options: question.options.map((option) =>
            option.id === optionId
              ? { ...option, text }
              : option,
          ),
        };
      }),
    );

    setErrors({});
    setNotice('');
  }

  function addOption(questionId) {
    setQuestions((current) =>
      current.map((question) => {
        if (question.id !== questionId) {
          return question;
        }

        if (question.options.length >= 6) {
          return question;
        }

        const nextId = crypto.randomUUID();

        return {
          ...question,
          options: [
            ...question.options,
            { id: nextId, text: '' },
          ],
        };
      }),
    );

    setErrors({});
    setNotice('');
  }

  function removeOption(questionId, optionId) {
    setQuestions((current) =>
      current.map((question) => {
        if (question.id !== questionId) {
          return question;
        }

        const remainingOptions = question.options.filter(
          (option) => option.id !== optionId,
        );

        return {
          ...question,
          options: remainingOptions,
          correctAnswer:
            question.correctAnswer === optionId
              ? ''
              : question.correctAnswer,
          correctAnswers: question.correctAnswers.filter(
            (answerId) => answerId !== optionId,
          ),
        };
      }),
    );

    setErrors({});
    setNotice('');
  }

  function handleTypeChange(questionId, type) {
    const question = questions.find(
      (item) => item.id === questionId,
    );

    if (!question) {
      return;
    }

    updateQuestion(questionId, {
      type,
      correctAnswer: '',
      correctAnswers: [],
      options:
        type === 'true-false'
          ? [
              { id: 'true', text: 'True' },
              { id: 'false', text: 'False' },
            ]
          : question.options.length >= 2
            ? question.options
            : [
                { id: crypto.randomUUID(), text: '' },
                { id: crypto.randomUUID(), text: '' },
              ],
    });
  }

  function validateQuestions() {
    const nextErrors = {};

    if (questions.length === 0) {
      nextErrors.general = 'Add at least one question.';
    }

    questions.forEach((question, index) => {
      const questionErrors = {};

      if (!question.text.trim()) {
        questionErrors.text = 'Question text is required.';
      }

      const marks = Number(question.marks);

      if (
        !question.marks ||
        !Number.isFinite(marks) ||
        marks <= 0 ||
        marks > 10000
      ) {
        questionErrors.marks =
          'Marks must be greater than 0 and at most 10,000.';
      }

      if (
        question.type === 'mcq' ||
        question.type === 'multiple-select' ||
        question.type === 'true-false'
      ) {
        if (question.options.length < 2) {
          questionErrors.options =
            'At least two answer options are required.';
        }

        if (
          question.options.some((option) => !option.text.trim())
        ) {
          questionErrors.options =
            'Complete all option fields before continuing.';
        }

        if (question.type === 'mcq' && !question.correctAnswer) {
          questionErrors.answer = 'Select the correct answer.';
        }

        if (
          question.type === 'multiple-select' &&
          question.correctAnswers.length === 0
        ) {
          questionErrors.answer =
            'Select at least one correct answer.';
        }

        const selectedAnswers =
          question.type === 'multiple-select'
            ? question.correctAnswers
            : [question.correctAnswer];

        if (
          selectedAnswers.some(
            (answerId) =>
              !question.options.some(
                (option) => option.id === answerId,
              ),
          )
        ) {
          questionErrors.answer =
            'Choose a valid answer from the available options.';
        }
      }

      if (Object.keys(questionErrors).length > 0) {
        nextErrors[question.id] = {
          ...questionErrors,
          number: index + 1,
        };
      }
    });

    return nextErrors;
  }

  function handleValidate() {
    const nextErrors = validateQuestions();

    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      const firstInvalidQuestion = questions.find(
        (question) => nextErrors[question.id],
      );

      if (firstInvalidQuestion) {
        setActiveQuestionId(firstInvalidQuestion.id);
      }

      setNotice('Review the highlighted questions before continuing.');
      return;
    }

    // Validation only. No quiz persistence is simulated.
    setNotice(
      'All questions passed client-side validation. They have not been saved because quiz backend integration is not available yet.',
    );
  }

  function removeQuestion(questionId) {
    setQuestions((current) =>
      current.filter((question) => question.id !== questionId),
    );

    setErrors({});
    setNotice('');

    if (activeQuestionId === questionId) {
      setActiveQuestionId(null);
    }
  }

  function toggleCorrectAnswer(questionId, optionId, checked) {
    const question = questions.find(
      (item) => item.id === questionId,
    );

    if (!question) {
      return;
    }

    const correctAnswers = checked
      ? [...new Set([...question.correctAnswers, optionId])]
      : question.correctAnswers.filter(
          (answerId) => answerId !== optionId,
        );

    updateQuestion(questionId, { correctAnswers });
  }

  function resetQuestions() {
    setQuestions([]);
    setActiveQuestionId(null);
    setErrors({});
    setNotice('');
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <PageHeader
        eyebrow="FACULTY WORKSPACE"
        title="Quiz Questions"
        description="Create questions, configure answer options, set correct answers, and assign marks."
        breadcrumbs={[
          {
            label: 'Faculty Dashboard',
            to: '/faculty/dashboard',
          },
          {
            label: 'Quizzes',
            to: '/faculty/quizzes',
          },
          {
            label: 'Question Configuration',
          },
        ]}
      />

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#343640] bg-[#191A21] p-5">
        <div>
          <p className="text-sm font-semibold text-[#EAEAE6]">
            Question Builder
          </p>

          <p className="mt-1 text-sm text-[#9697A2]">
            {questions.length} question
            {questions.length === 1 ? '' : 's'} · {totalMarks} total marks
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/faculty/quizzes"
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#454650] px-4 py-2 text-sm font-medium text-[#D0D0D8] transition-colors hover:border-[#CDB5F7]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
          >
            Back to Quizzes
          </Link>

          <ActionButton onClick={addQuestion}>
            Add Question
          </ActionButton>
        </div>
      </div>

      {errors.general && (
        <p
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
        >
          {errors.general}
        </p>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <SectionCard
          eyebrow="QUESTION LIST"
          title="Questions"
          description="Select a question to edit its content."
        >
          <div className="space-y-2">
            {questions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#454650] p-5 text-center">
                <p className="text-sm font-medium text-[#EAEAE6]">
                  No questions added
                </p>

                <p className="mt-2 text-sm leading-6 text-[#9697A2]">
                  Start by creating your first quiz question.
                </p>
              </div>
            ) : (
              questions.map((question, index) => {
                const isActive =
                  question.id === activeQuestionId;

                const questionError = errors[question.id];

                return (
                  <div
                    key={question.id}
                    className={[
                      'rounded-xl border p-3 transition-colors',
                      isActive
                        ? 'border-[#CDB5F7] bg-[#CDB5F7]/10'
                        : 'border-[#343640] bg-[#191A21]',
                    ].join(' ')}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setActiveQuestionId(question.id)
                      }
                      aria-pressed={isActive}
                      className="w-full rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="text-xs font-semibold uppercase tracking-wider text-[#9697A2]">
                          Question {index + 1}
                        </span>

                        <span className="text-xs text-[#CDB5F7]">
                          {question.marks || 0} marks
                        </span>
                      </span>

                      <span className="mt-2 block break-words text-sm font-medium text-[#EAEAE6]">
                        {question.text.trim() ||
                          'Untitled question'}
                      </span>

                      <span className="mt-2 block text-xs text-[#9697A2]">
                        {getQuestionTypeLabel(question.type)}
                      </span>
                    </button>

                    {questionError && (
                      <p className="mt-2 text-xs text-red-300">
                        Needs attention
                      </p>
                    )}

                    <div className="mt-3 border-t border-[#343640] pt-3">
                      <ActionButton
                        variant="secondary"
                        size="sm"
                        onClick={() =>
                          removeQuestion(question.id)
                        }
                      >
                        Remove
                      </ActionButton>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </SectionCard>

        <div className="min-w-0">
          {!activeQuestion ? (
            <SectionCard
              eyebrow="QUESTION EDITOR"
              title="Configure Question"
              description="Choose a question from the list or add a new one."
            >
              <div className="p-5 sm:p-6">
                <ActionButton onClick={addQuestion}>
                  Create First Question
                </ActionButton>
              </div>
            </SectionCard>
          ) : (
            <SectionCard
              eyebrow={`QUESTION ${questions.findIndex(
                (question) => question.id === activeQuestion.id,
              ) + 1}`}
              title="Question Editor"
              description="Configure question text, answer options, scoring, and explanation."
            >
              <div className="space-y-6 p-5 sm:p-6">
                <div>
                  <label
                    htmlFor="quiz-question-type"
                    className="mb-2 block text-sm font-semibold text-[#EAEAE6]"
                  >
                    Question Type
                  </label>

                  <select
                    id="quiz-question-type"
                    value={activeQuestion.type}
                    onChange={(event) =>
                      handleTypeChange(
                        activeQuestion.id,
                        event.target.value,
                      )
                    }
                    className="min-h-11 w-full rounded-xl border border-[#454650] bg-[#1D1F27] px-3.5 py-2.5 text-sm text-[#EAEAE6] outline-none transition-colors focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
                  >
                    {QUESTION_TYPES.map((type) => (
                      <option
                        key={type.value}
                        value={type.value}
                      >
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="quiz-question-text"
                    className="mb-2 block text-sm font-semibold text-[#EAEAE6]"
                  >
                    Question Text
                    <span className="ml-1 text-[#E5DF98]">*</span>
                  </label>

                  <textarea
                    id="quiz-question-text"
                    value={activeQuestion.text}
                    onChange={(event) =>
                      updateQuestion(activeQuestion.id, {
                        text: event.target.value,
                      })
                    }
                    rows={4}
                    maxLength={5000}
                    required
                    aria-invalid={Boolean(
                      errors[activeQuestion.id]?.text,
                    )}
                    className="w-full rounded-xl border border-[#454650] bg-[#1D1F27] px-3.5 py-3 text-sm leading-6 text-[#EAEAE6] outline-none transition-colors placeholder:text-[#858590] focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
                    placeholder="Write your question here..."
                  />

                  {errors[activeQuestion.id]?.text && (
                    <p
                      role="alert"
                      className="mt-2 text-sm text-red-300"
                    >
                      {errors[activeQuestion.id].text}
                    </p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="quiz-question-marks"
                    className="mb-2 block text-sm font-semibold text-[#EAEAE6]"
                  >
                    Marks
                  </label>

                  <input
                    id="quiz-question-marks"
                    type="number"
                    min="1"
                    max="10000"
                    step="1"
                    value={activeQuestion.marks}
                    onChange={(event) =>
                      updateQuestion(activeQuestion.id, {
                        marks: event.target.value,
                      })
                    }
                    className="min-h-11 w-full rounded-xl border border-[#454650] bg-[#1D1F27] px-3.5 py-2.5 text-sm text-[#EAEAE6] outline-none transition-colors focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20 sm:max-w-[200px]"
                  />

                  {errors[activeQuestion.id]?.marks && (
                    <p
                      role="alert"
                      className="mt-2 text-sm text-red-300"
                    >
                      {errors[activeQuestion.id].marks}
                    </p>
                  )}
                </div>

                {activeQuestion.type !== 'short-answer' && (
                  <div className="space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-semibold text-[#EAEAE6]">
                          Answer Options
                        </h3>

                        <p className="mt-1 text-xs leading-5 text-[#9697A2]">
                          {activeQuestion.type === 'multiple-select'
                            ? 'Select every correct answer.'
                            : 'Select the correct answer.'}
                        </p>
                      </div>

                      {activeQuestion.type !== 'true-false' &&
                        activeQuestion.options.length < 6 && (
                          <ActionButton
                            variant="secondary"
                            size="sm"
                            onClick={() =>
                              addOption(activeQuestion.id)
                            }
                          >
                            Add Option
                          </ActionButton>
                        )}
                    </div>

                    <div className="space-y-3">
                      {activeQuestion.options.map(
                        (option, optionIndex) => {
                          const isMultiple =
                            activeQuestion.type ===
                            'multiple-select';

                          const isCorrect = isMultiple
                            ? activeQuestion.correctAnswers.includes(
                                option.id,
                              )
                            : activeQuestion.correctAnswer ===
                              option.id;

                          return (
                            <div
                              key={option.id}
                              className="flex items-start gap-3 rounded-xl border border-[#343640] bg-[#191A21] p-3"
                            >
                              <input
                                type={
                                  isMultiple ? 'checkbox' : 'radio'
                                }
                                name={`correct-${activeQuestion.id}`}
                                checked={isCorrect}
                                onChange={(event) => {
                                  if (isMultiple) {
                                    toggleCorrectAnswer(
                                      activeQuestion.id,
                                      option.id,
                                      event.target.checked,
                                    );
                                  } else {
                                    updateQuestion(
                                      activeQuestion.id,
                                      {
                                        correctAnswer: option.id,
                                      },
                                    );
                                  }
                                }}
                                aria-label={`Mark option ${optionIndex + 1} as correct`}
                                className="mt-3 h-4 w-4 shrink-0 accent-[#CDB5F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
                              />

                              <div className="min-w-0 flex-1">
                                {activeQuestion.type ===
                                'true-false' ? (
                                  <p className="py-2 text-sm font-medium text-[#EAEAE6]">
                                    {option.text}
                                  </p>
                                ) : (
                                  <input
                                    type="text"
                                    value={option.text}
                                    onChange={(event) =>
                                      updateOption(
                                        activeQuestion.id,
                                        option.id,
                                        event.target.value,
                                      )
                                    }
                                    maxLength={1000}
                                    aria-label={`Option ${optionIndex + 1}`}
                                    placeholder={`Enter option ${optionIndex + 1}`}
                                    className="min-h-10 w-full rounded-lg border border-[#454650] bg-[#1D1F27] px-3 py-2 text-sm text-[#EAEAE6] outline-none transition-colors placeholder:text-[#858590] focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
                                  />
                                )}
                              </div>

                              {activeQuestion.type !==
                                'true-false' &&
                                activeQuestion.options.length > 2 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeOption(
                                        activeQuestion.id,
                                        option.id,
                                      )
                                    }
                                    className="mt-2 rounded-lg px-2 py-1 text-xs text-[#D58B95] transition-colors hover:bg-red-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CDB5F7]"
                                    aria-label={`Remove option ${optionIndex + 1}`}
                                  >
                                    Remove
                                  </button>
                                )}
                            </div>
                          );
                        },
                      )}
                    </div>

                    {errors[activeQuestion.id]?.options && (
                      <p
                        role="alert"
                        className="text-sm text-red-300"
                      >
                        {errors[activeQuestion.id].options}
                      </p>
                    )}

                    {errors[activeQuestion.id]?.answer && (
                      <p
                        role="alert"
                        className="text-sm text-red-300"
                      >
                        {errors[activeQuestion.id].answer}
                      </p>
                    )}
                  </div>
                )}

                <div>
                  <label
                    htmlFor="quiz-question-explanation"
                    className="mb-2 block text-sm font-semibold text-[#EAEAE6]"
                  >
                    Explanation (Optional)
                  </label>

                  <textarea
                    id="quiz-question-explanation"
                    value={activeQuestion.explanation}
                    onChange={(event) =>
                      updateQuestion(activeQuestion.id, {
                        explanation: event.target.value,
                      })
                    }
                    rows={3}
                    maxLength={3000}
                    className="w-full rounded-xl border border-[#454650] bg-[#1D1F27] px-3.5 py-3 text-sm leading-6 text-[#EAEAE6] outline-none transition-colors placeholder:text-[#858590] focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
                    placeholder="Explain why the correct answer is right..."
                  />
                </div>
              </div>
            </SectionCard>
          )}
        </div>
      </div>

      {notice && (
        <div
          role="status"
          className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-200"
        >
          {notice}
        </div>
      )}

      <div className="flex flex-col-reverse gap-3 border-t border-[#343640] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <ActionButton
          type="button"
          variant="secondary"
          onClick={resetQuestions}
        >
          Clear All Questions
        </ActionButton>

        <div className="flex flex-col-reverse gap-3 sm:flex-row">
          <ActionButton
            type="button"
            variant="secondary"
            onClick={addQuestion}
          >
            Add Another Question
          </ActionButton>

          <ActionButton
            type="button"
            onClick={handleValidate}
          >
            Validate Questions
          </ActionButton>
        </div>
      </div>

      <div className="rounded-xl border border-[#454650] bg-[#191A21] p-4">
        <p className="text-sm font-medium text-[#E5DF98]">
          Save integration pending
        </p>

        <p className="mt-2 text-sm leading-6 text-[#9697A2]">
          Questions are currently held in component state only. They are
          not persisted, and refreshing this page will clear them.
          Saving, editing persisted questions, and publishing a quiz
          require a confirmed backend API contract.
        </p>
      </div>
    </div>
  );
}