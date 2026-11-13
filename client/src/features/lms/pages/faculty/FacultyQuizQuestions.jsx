import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

import ActionButton from '../../components/ActionButton.jsx';
import PageHeader from '../../components/PageHeader.jsx';
import SectionCard from '../../components/SectionCard.jsx';

import quizManagementService from '../../services/quizManagementService.js';

const MAX_QUESTIONS = 200;
const MAX_OPTIONS = 10;
const MAX_TOTAL_MARKS = 10000;

function createOption(text = '') {
  return {
    id: crypto.randomUUID(),
    text,
  };
}

function createQuestion(question = {}) {
  const options = Array.isArray(question.options)
    ? question.options.map((option) =>
        createOption(typeof option === 'string' ? option : ''),
      )
    : [createOption(), createOption()];

  return {
    id: crypto.randomUUID(),
    text: question.question || '',
    marks: String(question.marks ?? 1),
    options,
    correctOptionIndex: String(
      question.correctOptionIndex ?? 0,
    ),
  };
}

function normalizeQuestion(question) {
  return {
    question: question.text.trim(),
    options: question.options.map((option) =>
      option.text.trim(),
    ),
    correctOptionIndex: Number(question.correctOptionIndex),
    marks: Number(question.marks),
  };
}

function formatError(error) {
  return (
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    'Unable to complete the question management request.'
  );
}

function QuestionFieldError({ children }) {
  if (!children) return null;

  return (
    <p className="mt-2 text-sm text-red-300" role="alert">
      {children}
    </p>
  );
}

export default function FacultyQuizQuestions() {
  const [searchParams] = useSearchParams();

  const quizId = searchParams.get('quizId');

  const [quiz, setQuiz] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [activeQuestionId, setActiveQuestionId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [errors, setErrors] = useState({});
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');

  const activeQuestion = questions.find(
    (question) => question.id === activeQuestionId,
  ) || null;

  const totalMarks = useMemo(
    () =>
      questions.reduce((total, question) => {
        const marks = Number(question.marks);

        return total + (
          Number.isInteger(marks) && marks > 0 ? marks : 0
        );
      }, 0),
    [questions],
  );

  const loadQuiz = useCallback(async () => {
    if (!quizId) {
      setError(
        'Quiz ID is missing. Open Question Management from a saved quiz.',
      );
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    setNotice('');

    try {
      const result = await quizManagementService.getQuiz(quizId);

      const loadedQuestions = Array.isArray(result.questions)
        ? result.questions.map(createQuestion)
        : [];

      setQuiz(result);
      setQuestions(loadedQuestions);
      setActiveQuestionId(
        loadedQuestions[0]?.id || null,
      );
      setErrors({});
    } catch (loadError) {
      setQuiz(null);
      setQuestions([]);
      setActiveQuestionId(null);
      setError(formatError(loadError));
    } finally {
      setLoading(false);
    }
  }, [quizId]);

  useEffect(() => {
    loadQuiz();
  }, [loadQuiz]);

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
    setError('');
  }

  function addQuestion() {
    if (questions.length >= MAX_QUESTIONS) {
      setError(
        `A quiz cannot contain more than ${MAX_QUESTIONS} questions.`,
      );
      return;
    }

    const question = createQuestion();

    setQuestions((current) => [...current, question]);
    setActiveQuestionId(question.id);
    setErrors({});
    setNotice('');
    setError('');
  }

  function removeQuestion(questionId) {
    const nextQuestions = questions.filter(
      (question) => question.id !== questionId,
    );

    setQuestions(nextQuestions);

    if (activeQuestionId === questionId) {
      setActiveQuestionId(
        nextQuestions[0]?.id || null,
      );
    }

    setErrors({});
    setNotice('');
    setError('');
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
    const question = questions.find(
      (item) => item.id === questionId,
    );

    if (!question || question.options.length >= MAX_OPTIONS) {
      return;
    }

    updateQuestion(questionId, {
      options: [...question.options, createOption()],
    });
  }

  function removeOption(questionId, optionId) {
    const question = questions.find(
      (item) => item.id === questionId,
    );

    if (!question || question.options.length <= 2) {
      return;
    }

    const removedIndex = question.options.findIndex(
      (option) => option.id === optionId,
    );

    const remainingOptions = question.options.filter(
      (option) => option.id !== optionId,
    );

    const currentCorrectIndex = Number(
      question.correctOptionIndex,
    );

    let nextCorrectIndex = currentCorrectIndex;

    if (removedIndex === currentCorrectIndex) {
      nextCorrectIndex = 0;
    } else if (removedIndex < currentCorrectIndex) {
      nextCorrectIndex -= 1;
    }

    updateQuestion(questionId, {
      options: remainingOptions,
      correctOptionIndex: String(nextCorrectIndex),
    });
  }

  function validateQuestions() {
    const nextErrors = {};

    if (questions.length === 0) {
      nextErrors.general =
        'Add at least one question before saving.';
    }

    if (questions.length > MAX_QUESTIONS) {
      nextErrors.general =
        `A quiz cannot contain more than ${MAX_QUESTIONS} questions.`;
    }

    let calculatedMarks = 0;

    questions.forEach((question, index) => {
      const questionErrors = {};

      if (!question.text.trim()) {
        questionErrors.text = 'Question text is required.';
      } else if (question.text.trim().length > 5000) {
        questionErrors.text =
          'Question text cannot exceed 5,000 characters.';
      }

      const marks = Number(question.marks);

      if (
        !Number.isInteger(marks) ||
        marks < 1 ||
        marks > 1000
      ) {
        questionErrors.marks =
          'Marks must be a whole number between 1 and 1,000.';
      } else {
        calculatedMarks += marks;
      }

      if (
        question.options.length < 2 ||
        question.options.length > MAX_OPTIONS
      ) {
        questionErrors.options =
          'Each question must contain between 2 and 10 options.';
      }

      if (
        question.options.some(
          (option) => !option.text.trim(),
        )
      ) {
        questionErrors.options =
          'Complete every answer option.';
      }

      if (
        question.options.some(
          (option) => option.text.trim().length > 1000,
        )
      ) {
        questionErrors.options =
          'An answer option cannot exceed 1,000 characters.';
      }

      const correctIndex = Number(
        question.correctOptionIndex,
      );

      if (
        !Number.isInteger(correctIndex) ||
        correctIndex < 0 ||
        correctIndex >= question.options.length
      ) {
        questionErrors.correctOptionIndex =
          'Select a valid correct answer.';
      }

      if (Object.keys(questionErrors).length > 0) {
        nextErrors[question.id] = {
          ...questionErrors,
          number: index + 1,
        };
      }
    });

    if (calculatedMarks > MAX_TOTAL_MARKS) {
      nextErrors.general =
        `Total marks cannot exceed ${MAX_TOTAL_MARKS}.`;
    }

    return nextErrors;
  }

  async function handleSave() {
    if (saving || !quizId) return;

    const nextErrors = validateQuestions();

    setErrors(nextErrors);
    setNotice('');
    setError('');

    if (Object.keys(nextErrors).length > 0) {
      const firstInvalidQuestion = questions.find(
        (question) => nextErrors[question.id],
      );

      if (firstInvalidQuestion) {
        setActiveQuestionId(firstInvalidQuestion.id);
      }

      setError(
        nextErrors.general ||
        'Review the highlighted questions before saving.',
      );

      return;
    }

    setSaving(true);

    try {
      const payload = {
        questions: questions.map(normalizeQuestion),
      };

      const updatedQuiz =
        await quizManagementService.updateQuiz(
          quizId,
          payload,
        );

      setQuiz(updatedQuiz);

      const savedQuestions = Array.isArray(updatedQuiz.questions)
        ? updatedQuiz.questions.map(createQuestion)
        : [];

      setQuestions(savedQuestions);

      setActiveQuestionId(
        savedQuestions[0]?.id || null,
      );

      setErrors({});
      setNotice('Quiz questions saved successfully.');
    } catch (saveError) {
      setError(formatError(saveError));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-[1200px]">
        <PageHeader
          eyebrow="FACULTY WORKSPACE"
          title="Quiz Questions"
          description="Loading quiz and its saved questions."
        />

        <SectionCard>
          <div className="flex min-h-48 items-center justify-center">
            <p className="text-sm text-[#9697A2]">
              Loading question editor...
            </p>
          </div>
        </SectionCard>
      </div>
    );
  }

  if (!quiz) {
    return (
      <div className="mx-auto w-full max-w-[1200px] space-y-6">
        <PageHeader
          eyebrow="FACULTY WORKSPACE"
          title="Quiz Questions"
          description="Open a saved quiz to manage its questions."
        />

        <SectionCard>
          <div className="space-y-4 p-5">
            <p className="text-sm leading-6 text-red-300" role="alert">
              {error || 'Quiz details could not be loaded.'}
            </p>

            <div className="flex flex-wrap gap-3">
              <ActionButton
                variant="secondary"
                onClick={loadQuiz}
              >
                Retry
              </ActionButton>

              <Link
                to="/faculty/quizzes"
                className="inline-flex min-h-10 items-center rounded-xl border border-[#454650] px-4 py-2 text-sm text-[#EAEAE6]"
              >
                Back to Quizzes
              </Link>
            </div>
          </div>
        </SectionCard>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1200px] space-y-6">
      <PageHeader
        eyebrow="FACULTY WORKSPACE"
        title="Quiz Questions"
        description={`Manage the questions for ${quiz.title}.`}
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
            {quiz.title}
          </p>

          <p className="mt-1 text-sm text-[#9697A2]">
            {questions.length} / {MAX_QUESTIONS} questions · {totalMarks} total marks
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            to="/faculty/quizzes"
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-[#454650] px-4 py-2 text-sm font-medium text-[#D0D0D8] transition-colors hover:border-[#CDB5F7]/50"
          >
            Back to Quizzes
          </Link>

          <ActionButton
            onClick={addQuestion}
            disabled={questions.length >= MAX_QUESTIONS || saving}
          >
            Add Question
          </ActionButton>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm leading-6 text-red-300"
        >
          {error}
        </div>
      )}

      {notice && (
        <div
          role="status"
          className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm leading-6 text-emerald-300"
        >
          {notice}
        </div>
      )}

      {errors.general && !error && (
        <div
          role="alert"
          className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300"
        >
          {errors.general}
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
        <SectionCard
          eyebrow="QUESTION LIST"
          title="Questions"
          description="Select a question to edit its content."
        >
          <div className="space-y-3">
            {questions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#454650] p-5 text-center">
                <p className="text-sm font-medium text-[#EAEAE6]">
                  No questions added
                </p>

                <p className="mt-2 text-sm leading-6 text-[#9697A2]">
                  Add your first multiple-choice question.
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
                          {question.marks} marks
                        </span>
                      </span>

                      <span className="mt-2 block break-words text-sm font-medium text-[#EAEAE6]">
                        {question.text.trim() || 'Untitled question'}
                      </span>
                    </button>

                    {questionError && (
                      <p className="mt-2 text-xs text-red-300">
                        Needs attention
                      </p>
                    )}

                    <div className="mt-3 border-t border-[#343640] pt-3">
                      <ActionButton
                        type="button"
                        variant="secondary"
                        size="sm"
                        disabled={saving}
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
                <ActionButton
                  onClick={addQuestion}
                  disabled={questions.length >= MAX_QUESTIONS}
                >
                  Create First Question
                </ActionButton>
              </div>
            </SectionCard>
          ) : (
            <SectionCard
              eyebrow={`QUESTION ${questions.findIndex(
                (question) => question.id === activeQuestion.id,
              ) + 1}`}
              title="Multiple Choice Question"
              description="Configure the question, answer options, correct answer, and marks."
            >
              <div className="space-y-6 p-5 sm:p-6">
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
                    className="w-full rounded-xl border border-[#454650] bg-[#1D1F27] px-3.5 py-3 text-sm leading-6 text-[#EAEAE6] outline-none placeholder:text-[#858590] focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
                    placeholder="Write your question here..."
                  />

                  <QuestionFieldError>
                    {errors[activeQuestion.id]?.text}
                  </QuestionFieldError>
                </div>

                <div>
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#EAEAE6]">
                        Answer Options
                      </p>

                      <p className="mt-1 text-xs text-[#9697A2]">
                        Add between 2 and {MAX_OPTIONS} options.
                      </p>
                    </div>

                    <ActionButton
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={
                        activeQuestion.options.length >= MAX_OPTIONS ||
                        saving
                      }
                      onClick={() =>
                        addOption(activeQuestion.id)
                      }
                    >
                      Add Option
                    </ActionButton>
                  </div>

                  <div className="space-y-3">
                    {activeQuestion.options.map((option, index) => (
                      <div
                        key={option.id}
                        className="flex flex-wrap items-center gap-3 rounded-xl border border-[#343640] bg-[#191A21] p-3"
                      >
                        <label className="flex min-w-0 flex-1 items-center gap-3">
                          <input
                            type="radio"
                            name={`correct-answer-${activeQuestion.id}`}
                            value={String(index)}
                            checked={
                              activeQuestion.correctOptionIndex ===
                              String(index)
                            }
                            onChange={() =>
                              updateQuestion(activeQuestion.id, {
                                correctOptionIndex: String(index),
                              })
                            }
                            className="h-4 w-4 accent-[#CDB5F7]"
                            aria-label={`Mark option ${index + 1} as correct`}
                          />

                          <span className="w-8 shrink-0 text-xs font-semibold text-[#9697A2]">
                            {String.fromCharCode(65 + index)}
                          </span>

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
                            placeholder={`Enter option ${index + 1}`}
                            className="min-h-10 min-w-0 flex-1 rounded-lg border border-[#454650] bg-[#1D1F27] px-3 py-2 text-sm text-[#EAEAE6] outline-none placeholder:text-[#858590] focus:border-[#CDB5F7]"
                          />
                        </label>

                        <button
                          type="button"
                          disabled={
                            activeQuestion.options.length <= 2 ||
                            saving
                          }
                          onClick={() =>
                            removeOption(
                              activeQuestion.id,
                              option.id,
                            )
                          }
                          className="rounded-lg px-3 py-2 text-xs font-semibold text-red-300 transition-colors hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>

                  <QuestionFieldError>
                    {errors[activeQuestion.id]?.options}
                  </QuestionFieldError>

                  <QuestionFieldError>
                    {errors[activeQuestion.id]?.correctOptionIndex}
                  </QuestionFieldError>

                  <p className="mt-3 text-xs leading-5 text-[#9697A2]">
                    Select the radio button next to the correct answer.
                  </p>
                </div>

                <div className="max-w-xs">
                  <label
                    htmlFor="quiz-question-marks"
                    className="mb-2 block text-sm font-semibold text-[#EAEAE6]"
                  >
                    Question Marks
                  </label>

                  <input
                    id="quiz-question-marks"
                    type="number"
                    min="1"
                    max="1000"
                    step="1"
                    value={activeQuestion.marks}
                    onChange={(event) =>
                      updateQuestion(activeQuestion.id, {
                        marks: event.target.value,
                      })
                    }
                    className="min-h-11 w-full rounded-xl border border-[#454650] bg-[#1D1F27] px-3.5 py-2.5 text-sm text-[#EAEAE6] outline-none focus:border-[#CDB5F7] focus:ring-2 focus:ring-[#CDB5F7]/20"
                  />

                  <QuestionFieldError>
                    {errors[activeQuestion.id]?.marks}
                  </QuestionFieldError>
                </div>
              </div>
            </SectionCard>
          )}
        </div>
      </div>

      <div className="flex flex-col-reverse gap-3 border-t border-[#343640] pt-5 sm:flex-row sm:items-center sm:justify-between">
        <Link
          to="/faculty/quizzes"
          className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#454650] px-4 py-2.5 text-sm font-semibold text-[#EAEAE6] transition-colors hover:bg-[#26272B]"
        >
          Back to Quizzes
        </Link>

        <ActionButton
          onClick={handleSave}
          disabled={saving || loading || questions.length === 0}
        >
          {saving ? 'Saving Questions...' : 'Save Questions'}
        </ActionButton>
      </div>
    </div>
  );
}