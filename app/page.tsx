'use client';

import { useEffect, useRef, useState } from 'react';
import './globals.css';

type Task = { id: string; title: string; completed: boolean };
type Filter = 'All' | 'Active' | 'Completed';
const STORAGE_KEY = 'daybook.tasks.v1';
const FILTERS: Filter[] = ['All', 'Active', 'Completed'];

function readTasks(raw: string): Task[] {
  const value: unknown = JSON.parse(raw);
  if (!Array.isArray(value)) throw new Error('Invalid backup');
  const ids = new Set<string>();
  return value.map((entry: unknown) => {
    if (typeof entry !== 'object' || entry === null) throw new Error('Invalid task');
    const task = entry as Record<string, unknown>;
    if (typeof task.id !== 'string' || !task.id || ids.has(task.id) ||
      typeof task.title !== 'string' || !task.title.trim() || task.title.length > 200 ||
      typeof task.completed !== 'boolean') throw new Error('Invalid task');
    ids.add(task.id);
    return { id: task.id, title: task.title.trim(), completed: task.completed };
  });
}

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [ready, setReady] = useState(false);
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [warning, setWarning] = useState('');
  const [title, setTitle] = useState('');
  const [filter, setFilter] = useState<Filter>('All');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [addError, setAddError] = useState('');
  const [editError, setEditError] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const titleInput = useRef<HTMLInputElement>(null);
  const editInput = useRef<HTMLInputElement>(null);
  const editButtons = useRef(new Map<string, HTMLButtonElement>());

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw !== null) setTasks(readTasks(raw));
    } catch {
      setStorageAvailable(false);
      setWarning('Browser storage could not be read. You can still use this app, but changes will only last until you leave or reload. Existing saved data will not be overwritten.');
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || !storageAvailable) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    } catch {
      setStorageAvailable(false);
      setWarning('Browser storage is unavailable or full. Your tasks are still usable here, but new changes may be lost when you leave or reload.');
    }
  }, [tasks, ready, storageAvailable]);

  useEffect(() => {
    if (editingId) {
      editInput.current?.focus();
      editInput.current?.select();
    }
  }, [editingId]);

  const remaining = tasks.filter(task => !task.completed).length;
  const completed = tasks.length - remaining;
  const ordered = [...tasks.filter(task => !task.completed), ...tasks.filter(task => task.completed)];
  const visible = ordered.filter(task => filter === 'All' || (filter === 'Completed' ? task.completed : !task.completed));

  function closeEditor(id: string) {
    setEditingId(null);
    setEditError('');
    requestAnimationFrame(() => editButtons.current.get(id)?.focus());
  }

  return (
    <main className="shell">
      <header className="brand-row">
        <a className="brand" href="/" aria-label="Daybook home"><span className="brand-icon" aria-hidden="true">✓</span> daybook<span className="brand-dot">.</span></a>
        <span className="local-badge"><span aria-hidden="true">●</span> Your browser, your space</span>
      </header>

      <section className="intro" aria-labelledby="page-title">
        <p className="eyebrow">A LITTLE FOCUS GOES A LONG WAY</p>
        <h1 id="page-title">Make room for your day.</h1>
        <p className="subtitle">Capture what matters. Take it one task at a time.</p>
      </section>

      {warning && <div className="warning" role="alert"><strong>Storage notice</strong><p>{warning}</p></div>}

      <section className="workspace" aria-label="Daily tasks" aria-busy={!ready}>
        <div className="workspace-heading">
          <div><h2>My tasks</h2><p>A clear list. A lighter mind.</p></div>
          <span className="count-badge">{ready ? `${remaining} remaining` : 'Loading…'}</span>
        </div>

        <form className="add-form" onSubmit={event => {
          event.preventDefault();
          const cleanTitle = title.trim();
          if (!cleanTitle) {
            setAddError('Give your task a title.');
            titleInput.current?.focus();
            return;
          }
          const id = typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
            ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
          setTasks(current => [...current, { id, title: cleanTitle, completed: false }]);
          setTitle('');
          setAddError('');
          setAnnouncement('Task added.');
          titleInput.current?.focus();
        }}>
          <label htmlFor="new-task">What needs doing?</label>
          <div className="add-controls">
            <input id="new-task" ref={titleInput} value={title} onChange={event => { setTitle(event.target.value); setAddError(''); }} placeholder="e.g. Make time for a walk" required maxLength={200} disabled={!ready} aria-invalid={!!addError} aria-describedby={addError ? 'add-error' : undefined} autoComplete="off" />
            <button className="primary" type="submit" disabled={!ready}><span aria-hidden="true">＋</span> Add task</button>
          </div>
          {addError && <p className="error" id="add-error" role="alert">{addError}</p>}
        </form>

        <div className="toolbar">
          <div className="filters" role="group" aria-label="Filter tasks">
            {FILTERS.map(item => <button key={item} type="button" aria-pressed={filter === item} className={filter === item ? 'selected' : ''} onClick={() => { setFilter(item); setEditingId(null); setEditError(''); }}>{item}<span>{item === 'All' ? tasks.length : item === 'Active' ? remaining : completed}</span></button>)}
          </div>
          <span className="order-note">Active tasks first</span>
        </div>

        {!ready ? <div className="empty"><p>Opening your task list…</p></div> : visible.length === 0 ? (
          <div className="empty">
            <span className="empty-icon" aria-hidden="true">{filter === 'Active' && tasks.length ? '✓' : '☀'}</span>
            <h3>{tasks.length === 0 ? 'A fresh start awaits.' : filter === 'Active' ? 'All caught up.' : 'Small steps add up.'}</h3>
            <p>{tasks.length === 0 ? 'Add your first task above and give your day a little direction.' : filter === 'Active' ? 'No active tasks. Enjoy a little breathing room.' : 'Completed tasks will appear here. Check one off when it’s done.'}</p>
          </div>
        ) : (
          <ul className="task-list" aria-label={`${filter} tasks`}>
            {visible.map(task => <li key={task.id} className={`task ${task.completed ? 'done' : ''}`}>
              <input className="task-check" type="checkbox" checked={task.completed} aria-label={`Mark ${task.title} ${task.completed ? 'incomplete' : 'complete'}`} onChange={() => {
                setTasks(current => current.map(item => item.id === task.id ? { ...item, completed: !item.completed } : item));
                setAnnouncement(task.completed ? 'Task marked active.' : 'Task completed.');
              }} />
              {editingId === task.id ? (
                <form className="edit-form" onSubmit={event => {
                  event.preventDefault();
                  const cleanTitle = draft.trim();
                  if (!cleanTitle) { setEditError('A task title cannot be empty.'); editInput.current?.focus(); return; }
                  setTasks(current => current.map(item => item.id === task.id ? { ...item, title: cleanTitle } : item));
                  setAnnouncement('Task updated.');
                  closeEditor(task.id);
                }} onKeyDown={event => { if (event.key === 'Escape') { event.preventDefault(); closeEditor(task.id); } }}>
                  <label className="sr-only" htmlFor={`edit-${task.id}`}>Edit task title</label>
                  <input id={`edit-${task.id}`} ref={editInput} value={draft} onChange={event => { setDraft(event.target.value); setEditError(''); }} required maxLength={200} aria-invalid={!!editError} aria-describedby={editError ? 'edit-error' : undefined} />
                  <div className="edit-actions"><button className="small-primary" type="submit">Save</button><button className="text-button" type="button" onClick={() => closeEditor(task.id)}>Cancel</button></div>
                  {editError && <p className="error" id="edit-error" role="alert">{editError}</p>}
                </form>
              ) : (
                <>
                  <span className="task-title">{task.title}</span>
                  <div className="task-actions">
                    <button className="text-button" type="button" ref={element => { if (element) editButtons.current.set(task.id, element); else editButtons.current.delete(task.id); }} aria-label={`Edit ${task.title}`} onClick={() => { setEditingId(task.id); setDraft(task.title); setEditError(''); }}>Edit</button>
                    <button className="text-button delete" type="button" aria-label={`Delete ${task.title}`} onClick={() => {
                      setTasks(current => current.filter(item => item.id !== task.id));
                      setAnnouncement('Task deleted.');
                      titleInput.current?.focus();
                    }}>Delete</button>
                  </div>
                </>
              )}
            </li>)}
          </ul>
        )}

        <footer className="workspace-footer"><span>{completed} of {tasks.length} completed</span><span>{storageAvailable ? 'Saved on this browser' : 'In-memory mode'}</span></footer>
      </section>
      <p className="footnote">Just you and your next step. No accounts, no distractions.</p>
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{announcement}</p>
    </main>
  );
}
