"use client";

import { useState } from "react";
import { apiDelete, apiPost, apiPut, useData } from "@/lib/data-context";
import { DSNote } from "@/lib/types";
import {
  DS_CONTENT,
  DS_SECTION_LABELS,
  DSContentSectionId,
} from "@/data/ds-content";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input, Textarea } from "@/components/ui/input";
import { RichContent } from "@/components/ui/rich-content";

type DSView = DSContentSectionId | "notes";

export function DataScienceSection() {
  const { data, loading, refresh } = useData();
  const [view, setView] = useState<DSView>("mathematics");
  const [collapsedBlocks, setCollapsedBlocks] = useState<Set<string>>(new Set());
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [editingNote, setEditingNote] = useState<DSNote | null>(null);
  const [noteForm, setNoteForm] = useState({ title: "", content: "" });

  const toggleBlock = (blockId: string) => {
    setCollapsedBlocks((prev) => {
      const next = new Set(prev);
      if (next.has(blockId)) next.delete(blockId);
      else next.add(blockId);
      return next;
    });
  };

  const toggleTopic = (topicId: string) => {
    setExpandedTopics((prev) => {
      const next = new Set(prev);
      if (next.has(topicId)) next.delete(topicId);
      else next.add(topicId);
      return next;
    });
  };

  const openNewNote = () => {
    setEditingNote(null);
    setNoteForm({ title: "", content: "" });
    setShowNoteModal(true);
  };

  const openEditNote = (note: DSNote) => {
    setEditingNote(note);
    setNoteForm({ title: note.title, content: note.content });
    setShowNoteModal(true);
  };

  const handleSaveNote = async () => {
    if (!noteForm.title.trim() || !noteForm.content.trim()) return;
    if (editingNote) {
      await apiPut("/api/ds/notes", {
        id: editingNote.id,
        title: noteForm.title,
        content: noteForm.content,
      });
    } else {
      await apiPost("/api/ds/notes", {
        title: noteForm.title,
        content: noteForm.content,
      });
    }
    setShowNoteModal(false);
    await refresh();
  };

  const handleDeleteNote = async (id: string) => {
    if (!confirm("Удалить заметку?")) return;
    await apiDelete(`/api/ds/notes?id=${id}`);
    await refresh();
  };

  if (loading) {
    return <div className="py-20 text-center text-neutral-400">Загрузка...</div>;
  }

  const subTabs: { id: DSView; label: string }[] = [
    ...DS_SECTION_LABELS,
    { id: "notes" as const, label: "Заметки" },
  ];

  const contentBlocks = view !== "notes" ? DS_CONTENT[view] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">Data Science</h2>
        <div className="flex rounded-lg bg-neutral-100 p-0.5 overflow-x-auto max-w-full">
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

      {view !== "notes" && (
        <p className="text-xs text-neutral-400">
          Контент редактируется в файле{" "}
          <code className="rounded bg-neutral-100 px-1.5 py-0.5 text-neutral-600">
            src/data/ds-content.ts
          </code>
        </p>
      )}

      {view !== "notes" ? (
        <div className="space-y-3">
          {contentBlocks.map((block) => {
            const blockCollapsed = collapsedBlocks.has(block.id);
            return (
              <div
                key={block.id}
                className="rounded-xl border border-neutral-100 bg-white overflow-hidden"
              >
                <button
                  onClick={() => toggleBlock(block.id)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-neutral-50 transition"
                >
                  <span className="font-medium text-neutral-900">{block.title}</span>
                  <span className="text-neutral-400 text-sm">
                    {blockCollapsed ? "▼" : "▲"}
                  </span>
                </button>

                {!blockCollapsed && (
                  <div className="border-t border-neutral-100 px-2 pb-2">
                    {block.topics.map((topic) => {
                      const topicExpanded = expandedTopics.has(topic.id);
                      return (
                        <div key={topic.id} className="mx-2 mt-2 rounded-lg border border-neutral-100">
                          <button
                            onClick={() => toggleTopic(topic.id)}
                            className="flex w-full items-center justify-between px-3 py-2.5 text-left hover:bg-neutral-50 transition rounded-lg"
                          >
                            <span className="text-sm font-medium text-neutral-800">
                              {topic.title}
                            </span>
                            <span className="text-neutral-400 text-xs">
                              {topicExpanded ? "▲" : "▼"}
                            </span>
                          </button>
                          {topicExpanded && (
                            <div className="border-t border-neutral-100 px-4 py-3">
                              <RichContent content={topic.content} />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <>
          <div className="flex justify-end">
            <Button size="sm" onClick={openNewNote}>
              + Заметка
            </Button>
          </div>

          {data.dsNotes.length === 0 ? (
            <div className="rounded-xl border border-neutral-100 bg-white py-12 text-center text-neutral-400">
              Добавьте инсайты и заметки
            </div>
          ) : (
            <div className="space-y-2">
              {data.dsNotes.map((note) => (
                <div
                  key={note.id}
                  className="group rounded-xl border border-neutral-100 bg-white p-4 transition hover:border-neutral-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <button className="flex-1 text-left" onClick={() => openEditNote(note)}>
                      <p className="font-medium text-neutral-900">{note.title}</p>
                      <p className="mt-2 text-sm text-neutral-600 whitespace-pre-wrap">
                        {note.content}
                      </p>
                    </button>
                    <button
                      onClick={() => handleDeleteNote(note.id)}
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

      <Modal
        open={showNoteModal}
        onClose={() => setShowNoteModal(false)}
        title={editingNote ? "Редактировать заметку" : "Новая заметка"}
      >
        <div className="space-y-4">
          <Input
            label="Заголовок"
            value={noteForm.title}
            onChange={(e) => setNoteForm({ ...noteForm, title: e.target.value })}
            autoFocus
          />
          <Textarea
            label="Текст"
            value={noteForm.content}
            onChange={(e) => setNoteForm({ ...noteForm, content: e.target.value })}
            rows={6}
          />
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowNoteModal(false)}>
              Отмена
            </Button>
            <Button onClick={handleSaveNote}>Сохранить</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
