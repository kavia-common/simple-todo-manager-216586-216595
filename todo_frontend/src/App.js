import React, { useEffect, useMemo, useRef, useState } from 'react';
import './App.css';
import './theme.css';

/**
 * Types:
 * Todo = { id: string, title: string, completed: boolean, createdAt: number }
 */

const STORAGE_KEY = 'kavia_todos_v1';
const FILTERS = {
  all: 'All',
  active: 'Active',
  completed: 'Completed',
};

// Sample todos for first run
const SAMPLE_TODOS = [
  { id: 't1', title: 'Welcome to your Todo app', completed: false, createdAt: Date.now() - 10000 },
  { id: 't2', title: 'Click to edit a task inline', completed: false, createdAt: Date.now() - 9000 },
  { id: 't3', title: 'Check the box to mark as complete', completed: true, createdAt: Date.now() - 8000 },
];

function uuid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

function useLocalStorageTodos() {
  const [todos, setTodos] = useState(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
      return SAMPLE_TODOS;
    } catch {
      return SAMPLE_TODOS;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    } catch {
      // ignore storage errors
    }
  }, [todos]);

  return [todos, setTodos];
}

// PUBLIC_INTERFACE
function App() {
  /** Main app state: todos + filter */
  const [todos, setTodos] = useLocalStorageTodos();
  const [filter, setFilter] = useState('all');

  const remaining = useMemo(() => todos.filter(t => !t.completed).length, [todos]);

  const filteredTodos = useMemo(() => {
    if (filter === 'active') return todos.filter(t => !t.completed);
    if (filter === 'completed') return todos.filter(t => t.completed);
    return todos;
  }, [todos, filter]);

  const addTodo = (title) => {
    const trimmed = title.trim();
    if (!trimmed) return;
    setTodos(prev => [{ id: uuid(), title: trimmed, completed: false, createdAt: Date.now() }, ...prev]);
  };

  const toggleTodo = (id) => {
    setTodos(prev => prev.map(t => (t.id === id ? { ...t, completed: !t.completed } : t)));
  };

  const deleteTodo = (id) => {
    setTodos(prev => prev.filter(t => t.id !== id));
  };

  const editTodo = (id, title) => {
    const trimmed = title.trim();
    if (!trimmed) {
      // if cleared, delete
      deleteTodo(id);
      return;
    }
    setTodos(prev => prev.map(t => (t.id === id ? { ...t, title: trimmed } : t)));
  };

  const clearCompleted = () => {
    setTodos(prev => prev.filter(t => !t.completed));
  };

  return (
    <div className="app-gradient">
      <div className="container">
        <header className="header" role="banner" aria-label="App header">
          <div className="brand-badge" aria-hidden="true">
            <span>🌊</span>
            <span>Ocean Professional</span>
          </div>
          <h1 className="title">Simple Todo</h1>
          <p className="subtitle">Plan your day with clarity and focus.</p>
        </header>

        <main aria-label="Todo manager" role="main">
          <section className="card" aria-labelledby="add-todo-heading">
            <h2 id="add-todo-heading" className="sr-only" style={{position:'absolute',left:'-9999px'}}>Add new todo</h2>
            <AddTodo onAdd={addTodo} />
            <div className="toolbar" aria-label="Filters and actions">
              <div className="filters" role="group" aria-label="Filter todos">
                <FilterButton label={FILTERS.all} active={filter === 'all'} onClick={() => setFilter('all')} />
                <FilterButton label={FILTERS.active} active={filter === 'active'} onClick={() => setFilter('active')} />
                <FilterButton label={FILTERS.completed} active={filter === 'completed'} onClick={() => setFilter('completed')} />
              </div>
              <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                <span className="counter" aria-live="polite">{remaining} item{remaining !== 1 ? 's' : ''} left</span>
                <button className="btn btn-secondary" onClick={clearCompleted} aria-label="Clear completed todos">
                  Clear completed
                </button>
              </div>
            </div>

            <TodoList
              todos={filteredTodos}
              onToggle={toggleTodo}
              onDelete={deleteTodo}
              onEdit={editTodo}
            />
          </section>

          <p className="footer-note">Data is saved locally in your browser.</p>
        </main>
      </div>
    </div>
  );
}

function FilterButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      className="filter-btn"
      aria-pressed={active}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function AddTodo({ onAdd }) {
  const [value, setValue] = useState('');
  const inputRef = useRef(null);

  const submit = () => {
    if (!value.trim()) return;
    onAdd(value);
    setValue('');
    // keep focus for rapid entry
    inputRef.current?.focus();
  };

  return (
    <div className="add-row" role="form" aria-label="Add todo">
      <label htmlFor="add-todo-input" className="sr-only" style={{position:'absolute',left:'-9999px'}}>Add todo</label>
      <input
        id="add-todo-input"
        ref={inputRef}
        className="input"
        type="text"
        value={value}
        placeholder="What needs to be done?"
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            submit();
          }
        }}
        aria-label="Todo title"
      />
      <button
        type="button"
        className="btn btn-primary"
        onClick={submit}
        aria-label="Add todo"
      >
        Add
      </button>
    </div>
  );
}

function TodoList({ todos, onToggle, onDelete, onEdit }) {
  if (!todos.length) {
    return <div className="empty" role="status" aria-live="polite">No todos yet. Add one above to get started.</div>;
  }

  return (
    <ul className="list" role="list" aria-label="Todo list">
      {todos.map(todo => (
        <TodoItem
          key={todo.id}
          todo={todo}
          onToggle={() => onToggle(todo.id)}
          onDelete={() => onDelete(todo.id)}
          onEdit={(title) => onEdit(todo.id, title)}
        />
      ))}
    </ul>
  );
}

function TodoItem({ todo, onToggle, onDelete, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.title);
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    if (draft !== todo.title) {
      onEdit(draft);
    }
  };

  const cancel = () => {
    setDraft(todo.title);
    setEditing(false);
  };

  return (
    <li className="item" role="listitem" aria-label={`Todo: ${todo.title}`}>
      <input
        type="checkbox"
        className="checkbox"
        checked={todo.completed}
        onChange={onToggle}
        aria-checked={todo.completed}
        aria-label={todo.completed ? 'Mark as active' : 'Mark as completed'}
      />
      <div>
        {!editing ? (
          <button
            className="btn btn-ghost title-text"
            style={{ padding: 0 }}
            onClick={() => setEditing(true)}
            title="Click to edit"
            aria-label={`Edit ${todo.title}`}
          >
            <span className={`title-text ${todo.completed ? 'completed' : ''}`}>{todo.title}</span>
          </button>
        ) : (
          <input
            ref={inputRef}
            className="inline-edit"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commit();
              if (e.key === 'Escape') cancel();
            }}
            aria-label="Edit todo title"
          />
        )}
      </div>
      <div className="row-actions">
        {editing ? (
          <>
            <button className="btn btn-secondary" onClick={commit} aria-label="Save">Save</button>
            <button className="btn btn-ghost" onClick={cancel} aria-label="Cancel">Cancel</button>
          </>
        ) : (
          <button className="btn btn-danger" onClick={onDelete} aria-label={`Delete ${todo.title}`}>
            Delete
          </button>
        )}
      </div>
    </li>
  );
}

export default App;
