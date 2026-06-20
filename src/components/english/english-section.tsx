"use client";

import { useEffect, useState } from "react";
import { apiDelete, apiPost, apiPut, useData } from "@/lib/data-context";
import { EnglishTopic, EnglishWord, GrammarRule } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Select, Textarea } from "@/components/ui/input";

type EnglishView = "dictionary" | "grammar" | "study";

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function EnglishSection() {
  const { data, loading, refresh } = useData();
  const [view, setView] = useState<EnglishView>("dictionary");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [showTopicModal, setShowTopicModal] = useState(false);
  const [showWordModal, setShowWordModal] = useState(false);
  const [showGrammarModal, setShowGrammarModal] = useState(false);
  const [topicName, setTopicName] = useState("");
  const [editingWord, setEditingWord] = useState<EnglishWord | null>(null);
  const [editingRule, setEditingRule] = useState<GrammarRule | null>(null);
  const [wordForm, setWordForm] = useState({
    english: "",
    russian: "",
    phrases: "",
    topicId: "",
  });
  const [grammarForm, setGrammarForm] = useState({ title: "", content: "" });

  const [studyTopicIds, setStudyTopicIds] = useState<Set<string>>(new Set());
  const [sessionActive, setSessionActive] = useState(false);
  const [queue, setQueue] = useState<EnglishWord[]>([]);
  const [currentWord, setCurrentWord] = useState<EnglishWord | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [learnedCount, setLearnedCount] = useState(0);
  const [totalInSession, setTotalInSession] = useState(0);

  const topics = data.englishTopics;
  const activeTopic = selectedTopic || topics[0]?.id || null;
  const topicWords = data.englishWords.filter((w) => w.topicId === activeTopic);

  useEffect(() => {
    setStudyTopicIds(new Set(topics.map((t) => t.id)));
  }, [topics]);

  const openNewWord = () => {
    setEditingWord(null);
    setWordForm({
      english: "",
      russian: "",
      phrases: "",
      topicId: activeTopic || topics[0]?.id || "",
    });
    setShowWordModal(true);
  };

  const openEditWord = (word: EnglishWord) => {
    setEditingWord(word);
    setWordForm({
      english: word.english,
      russian: word.russian,
      phrases: word.phrases || "",
      topicId: word.topicId,
    });
    setShowWordModal(true);
  };

  const handleCreateTopic = async () => {
    if (!topicName.trim()) return;
    await apiPost<EnglishTopic>("/api/english/topics", { name: topicName });
    setTopicName("");
    setShowTopicModal(false);
    await refresh();
  };

  const handleDeleteTopic = async (id: string) => {
    if (!confirm("Удалить тему и все слова в ней?")) return;
    await apiDelete(`/api/english/topics?id=${id}`);
    if (selectedTopic === id) setSelectedTopic(null);
    await refresh();
  };

  const handleSaveWord = async () => {
    if (!wordForm.english.trim() || !wordForm.russian.trim() || !wordForm.topicId) return;
    if (editingWord) {
      await apiPut("/api/english/words", {
        id: editingWord.id,
        english: wordForm.english,
        russian: wordForm.russian,
        phrases: wordForm.phrases,
        topicId: wordForm.topicId,
      });
    } else {
      await apiPost("/api/english/words", {
        english: wordForm.english,
        russian: wordForm.russian,
        phrases: wordForm.phrases,
        topicId: wordForm.topicId,
      });
    }
    setShowWordModal(false);
    await refresh();
  };

  const handleDeleteWord = async (id: string) => {
    if (!confirm("Удалить слово?")) return;
    await apiDelete(`/api/english/words?id=${id}`);
    await refresh();
  };

  const openNewGrammar = () => {
    setEditingRule(null);
    setGrammarForm({ title: "", content: "" });
    setShowGrammarModal(true);
  };

  const openEditGrammar = (rule: GrammarRule) => {
    setEditingRule(rule);
    setGrammarForm({ title: rule.title, content: rule.content });
    setShowGrammarModal(true);
  };

  const handleSaveGrammar = async () => {
    if (!grammarForm.title.trim() || !grammarForm.content.trim()) return;
    if (editingRule) {
      await apiPut("/api/english/grammar", {
        id: editingRule.id,
        title: grammarForm.title,
        content: grammarForm.content,
      });
    } else {
      await apiPost("/api/english/grammar", {
        title: grammarForm.title,
        content: grammarForm.content,
      });
    }
    setShowGrammarModal(false);
    await refresh();
  };

  const handleDeleteGrammar = async (id: string) => {
    if (!confirm("Удалить правило?")) return;
    await apiDelete(`/api/english/grammar?id=${id}`);
    await refresh();
  };

  const toggleStudyTopic = (id: string) => {
    setStudyTopicIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startStudy = () => {
    const words = data.englishWords.filter((w) => studyTopicIds.has(w.topicId));
    if (words.length === 0) return;
    const shuffled = shuffle(words);
    setTotalInSession(shuffled.length);
    setLearnedCount(0);
    setCurrentWord(shuffled[0]);
    setQueue(shuffled.slice(1));
    setFlipped(false);
    setSessionActive(true);
  };

  const advanceQueue = (remaining: EnglishWord[]) => {
    if (remaining.length === 0) {
      setCurrentWord(null);
      setSessionActive(false);
      return;
    }
    setCurrentWord(remaining[0]);
    setQueue(remaining.slice(1));
    setFlipped(false);
  };

  const handleLearned = () => {
    setLearnedCount((c) => c + 1);
    advanceQueue(queue);
  };

  const handleDifficult = () => {
    if (!currentWord) return;
    advanceQueue([...queue, currentWord]);
  };

  const stopStudy = () => {
    setSessionActive(false);
    setCurrentWord(null);
    setQueue([]);
    setFlipped(false);
  };

  if (loading) {
    return <div className="py-20 text-center text-neutral-400">Загрузка...</div>;
  }

  const subTabs: { id: EnglishView; label: string }[] = [
    { id: "dictionary", label: "Словарь" },
    { id: "grammar", label: "Грамматика" },
    { id: "study", label: "Заучивание" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Английский язык</h2>
        <div className="flex rounded-lg bg-neutral-100 p-0.5 overflow-x-auto">
          {subTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setView(t.id)}
              className={`shrink-0 rounded-md px-3 py-1.5 text-xs font-medium transition ${
                view === t.id
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {view === "dictionary" && (
        <>
          {topics.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-neutral-200 py-16 text-center">
              <p className="text-neutral-500">Создайте первую тему</p>
              <Button className="mt-4" size="sm" onClick={() => setShowTopicModal(true)}>
                + Тема
              </Button>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-neutral-500">Темы</h3>
                <div className="flex gap-2">
                  <Button size="sm" variant="secondary" onClick={() => setShowTopicModal(true)}>
                    + Тема
                  </Button>
                  <Button size="sm" onClick={openNewWord}>
                    + Слово
                  </Button>
                </div>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1">
                {topics.map((topic) => (
                  <div key={topic.id} className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={() => setSelectedTopic(topic.id)}
                      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                        activeTopic === topic.id
                          ? "bg-neutral-900 text-white"
                          : "bg-white text-neutral-600 border border-neutral-200 hover:border-neutral-300"
                      }`}
                    >
                      {topic.name}
                    </button>
                    <button
                      onClick={() => handleDeleteTopic(topic.id)}
                      className="rounded-full p-1.5 text-neutral-300 hover:bg-red-50 hover:text-red-500"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              {topicWords.length === 0 ? (
                <div className="rounded-xl border border-neutral-100 bg-white py-12 text-center text-neutral-400">
                  Нет слов — добавьте первое
                </div>
              ) : (
                <div className="space-y-2">
                  {topicWords.map((word) => (
                    <div
                      key={word.id}
                      className="group rounded-xl border border-neutral-100 bg-white p-4 transition hover:border-neutral-200"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button className="flex-1 text-left" onClick={() => openEditWord(word)}>
                          <p className="font-medium text-neutral-900">{word.english}</p>
                          <p className="mt-1 text-sm text-neutral-600">{word.russian}</p>
                          {word.phrases && (
                            <p className="mt-2 text-xs text-neutral-400">{word.phrases}</p>
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteWord(word.id)}
                          className="opacity-0 group-hover:opacity-100 rounded-lg p-1.5 text-neutral-300 hover:bg-red-50 hover:text-red-500 transition"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </>
      )}

      {view === "grammar" && (
        <>
          <div className="flex justify-end">
            <Button size="sm" onClick={openNewGrammar}>
              + Правило
            </Button>
          </div>

          {data.grammarRules.length === 0 ? (
            <div className="rounded-xl border border-neutral-100 bg-white py-12 text-center text-neutral-400">
              Добавьте грамматические правила
            </div>
          ) : (
            <div className="space-y-2">
              {data.grammarRules.map((rule) => (
                <div
                  key={rule.id}
                  className="group rounded-xl border border-neutral-100 bg-white p-4 transition hover:border-neutral-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <button className="flex-1 text-left" onClick={() => openEditGrammar(rule)}>
                      <p className="font-medium text-neutral-900">{rule.title}</p>
                      <p className="mt-2 text-sm text-neutral-600 whitespace-pre-wrap">
                        {rule.content}
                      </p>
                    </button>
                    <button
                      onClick={() => handleDeleteGrammar(rule.id)}
                      className="opacity-0 group-hover:opacity-100 rounded-lg p-1.5 text-neutral-300 hover:bg-red-50 hover:text-red-500 transition"
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {view === "study" && (
        <>
          {!sessionActive ? (
            <>
              <p className="text-sm text-neutral-500">
                Выберите темы для сессии. По умолчанию выбраны все.
              </p>

              {topics.length === 0 ? (
                <div className="rounded-xl border border-neutral-100 bg-white py-12 text-center text-neutral-400">
                  Сначала добавьте темы и слова в словаре
                </div>
              ) : (
                <>
                  <div className="space-y-2 rounded-xl border border-neutral-100 bg-white p-4">
                    {topics.map((topic) => {
                      const count = data.englishWords.filter((w) => w.topicId === topic.id).length;
                      return (
                        <label
                          key={topic.id}
                          className="flex cursor-pointer items-center gap-3 rounded-lg px-2 py-2 hover:bg-neutral-50"
                        >
                          <input
                            type="checkbox"
                            checked={studyTopicIds.has(topic.id)}
                            onChange={() => toggleStudyTopic(topic.id)}
                            className="h-4 w-4 rounded border-neutral-300"
                          />
                          <span className="flex-1 text-sm font-medium text-neutral-800">
                            {topic.name}
                          </span>
                          <span className="text-xs text-neutral-400">{count} слов</span>
                        </label>
                      );
                    })}
                  </div>

                  <Button
                    onClick={startStudy}
                    disabled={
                      data.englishWords.filter((w) => studyTopicIds.has(w.topicId)).length === 0
                    }
                  >
                    Начать заучивание
                  </Button>
                </>
              )}
            </>
          ) : currentWord ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-sm text-neutral-500">
                <span>
                  Заучено: {learnedCount} / {totalInSession}
                </span>
                <span>Осталось: {queue.length + 1}</span>
              </div>

              <button
                onClick={() => setFlipped((f) => !f)}
                className="w-full min-h-[220px] rounded-2xl border border-neutral-200 bg-white p-8 text-center shadow-sm transition hover:border-neutral-300 hover:shadow-md"
              >
                {!flipped ? (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-neutral-400 mb-4">
                      English
                    </p>
                    <p className="text-3xl font-semibold text-neutral-900">{currentWord.english}</p>
                    <p className="mt-6 text-xs text-neutral-400">Нажмите, чтобы перевернуть</p>
                  </div>
                ) : (
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-neutral-400 mb-4">
                      Перевод
                    </p>
                    <p className="text-2xl font-semibold text-neutral-900">{currentWord.russian}</p>
                    {currentWord.phrases && (
                      <p className="mt-4 text-sm text-neutral-500 whitespace-pre-wrap">
                        {currentWord.phrases}
                      </p>
                    )}
                  </div>
                )}
              </button>

              {flipped && (
                <div className="flex gap-3">
                  <Button
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    onClick={handleLearned}
                  >
                    Заучено
                  </Button>
                  <Button
                    className="flex-1 bg-red-500 hover:bg-red-600"
                    onClick={handleDifficult}
                  >
                    Ещё раз
                  </Button>
                </div>
              )}

              <Button variant="secondary" size="sm" onClick={stopStudy}>
                Завершить сессию
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-neutral-100 bg-white py-12 text-center">
              <p className="font-medium text-neutral-800">Сессия завершена</p>
              <p className="mt-1 text-sm text-neutral-500">
                Заучено слов: {learnedCount} из {totalInSession}
              </p>
              <Button className="mt-4" size="sm" onClick={() => setSessionActive(false)}>
                Назад
              </Button>
            </div>
          )}
        </>
      )}

      <Modal open={showTopicModal} onClose={() => setShowTopicModal(false)} title="Новая тема">
        <div className="space-y-4">
          <Input
            label="Название темы"
            value={topicName}
            onChange={(e) => setTopicName(e.target.value)}
            placeholder="Travel, Business..."
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowTopicModal(false)}>
              Отмена
            </Button>
            <Button onClick={handleCreateTopic}>Создать</Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showWordModal}
        onClose={() => setShowWordModal(false)}
        title={editingWord ? "Редактировать слово" : "Новое слово"}
      >
        <div className="space-y-4">
          <Input
            label="Слово (English)"
            value={wordForm.english}
            onChange={(e) => setWordForm({ ...wordForm, english: e.target.value })}
            autoFocus
          />
          <Input
            label="Перевод (русский)"
            value={wordForm.russian}
            onChange={(e) => setWordForm({ ...wordForm, russian: e.target.value })}
          />
          <Textarea
            label="Ключевые фразы (необязательно)"
            value={wordForm.phrases}
            onChange={(e) => setWordForm({ ...wordForm, phrases: e.target.value })}
            rows={3}
            placeholder="Примеры использования..."
          />
          {topics.length > 0 && (
            <Select
              label="Тема"
              value={wordForm.topicId}
              onChange={(e) => setWordForm({ ...wordForm, topicId: e.target.value })}
              options={topics.map((t) => ({ value: t.id, label: t.name }))}
            />
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowWordModal(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveWord}>Сохранить</Button>
          </div>
        </div>
      </Modal>

      <Modal
        open={showGrammarModal}
        onClose={() => setShowGrammarModal(false)}
        title={editingRule ? "Редактировать правило" : "Новое правило"}
      >
        <div className="space-y-4">
          <Input
            label="Заголовок"
            value={grammarForm.title}
            onChange={(e) => setGrammarForm({ ...grammarForm, title: e.target.value })}
            autoFocus
          />
          <Textarea
            label="Правило"
            value={grammarForm.content}
            onChange={(e) => setGrammarForm({ ...grammarForm, content: e.target.value })}
            rows={6}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowGrammarModal(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveGrammar}>Сохранить</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
