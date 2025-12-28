---
title: TodoMVC UI Components
status: pending
done_when: |
  cd todomvc && pnpm dev
  verify: app renders with full TodoMVC UI, all interactions work
basis: |
  Not started.
blocked_by:
  - .tasks/impl/todomvc-atoms.md
  - .tasks/impl/todomvc-storage.md
artifacts:
  - path: todomvc/src/components/Header.tsx
    description: New todo input component
  - path: todomvc/src/components/TodoList.tsx
    description: List container with toggle-all
  - path: todomvc/src/components/TodoItem.tsx
    description: Individual todo item with edit mode
  - path: todomvc/src/components/Footer.tsx
    description: Filter tabs, counter, clear completed
  - path: todomvc/src/App.tsx
    description: Root component with routing
---

# Impl: TodoMVC UI Components

## Objective

Build React components that implement the TodoMVC UI using effect-atom hooks.

## Component Structure

```
<App>
  <section class="todoapp">
    <Header />           # h1 + new todo input
    <TodoList>           # main section (hidden when empty)
      <TodoItem />...    # li for each todo
    </TodoList>
    <Footer />           # footer section (hidden when empty)
  </section>
</App>
```

## Components

### Header.tsx

```tsx
function Header() {
  const [text, setText] = useState('')
  const addTodo = useAtomSet(addTodoAtom)
  
  const handleSubmit = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && text.trim()) {
      addTodo(text.trim())
      setText('')
    }
  }
  
  return (
    <header className="header">
      <h1>todos</h1>
      <input
        className="new-todo"
        placeholder="What needs to be done?"
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={handleSubmit}
        autoFocus
      />
    </header>
  )
}
```

### TodoList.tsx

```tsx
function TodoList() {
  const todos = useAtomValue(filteredTodosAtom)
  const allCompleted = useAtomValue(allCompletedAtom)
  const toggleAll = useAtomSet(toggleAllAtom)
  const hasTodos = useAtomValue(hasTodosAtom)
  
  if (!hasTodos) return null
  
  return (
    <section className="main">
      <input
        id="toggle-all"
        className="toggle-all"
        type="checkbox"
        checked={allCompleted}
        onChange={() => toggleAll()}
      />
      <label htmlFor="toggle-all">Mark all as complete</label>
      <ul className="todo-list">
        {todos.map(todo => (
          <TodoItem key={todo.id} todo={todo} />
        ))}
      </ul>
    </section>
  )
}
```

### TodoItem.tsx

```tsx
function TodoItem({ todo }: { todo: Todo }) {
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(todo.text)
  const toggleTodo = useAtomSet(toggleTodoAtom)
  const deleteTodo = useAtomSet(deleteTodoAtom)
  const editTodo = useAtomSet(editTodoAtom)
  
  const handleEdit = () => {
    setEditing(true)
    setEditText(todo.text)
  }
  
  const handleSubmit = () => {
    const text = editText.trim()
    if (text) {
      editTodo({ id: todo.id, text })
    } else {
      deleteTodo(todo.id)
    }
    setEditing(false)
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSubmit()
    if (e.key === 'Escape') {
      setEditText(todo.text)
      setEditing(false)
    }
  }
  
  return (
    <li className={classNames({
      completed: todo.completed,
      editing
    })}>
      <div className="view">
        <input
          className="toggle"
          type="checkbox"
          checked={todo.completed}
          onChange={() => toggleTodo(todo.id)}
        />
        <label onDoubleClick={handleEdit}>{todo.text}</label>
        <button className="destroy" onClick={() => deleteTodo(todo.id)} />
      </div>
      {editing && (
        <input
          className="edit"
          value={editText}
          onChange={e => setEditText(e.target.value)}
          onBlur={handleSubmit}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      )}
    </li>
  )
}
```

### Footer.tsx

```tsx
function Footer() {
  const activeCount = useAtomValue(activeCountAtom)
  const hasCompleted = useAtomValue(hasCompletedAtom)
  const hasTodos = useAtomValue(hasTodosAtom)
  const filter = useAtomValue(filterAtom)
  const setFilter = useAtomSet(filterAtom)
  const clearCompleted = useAtomSet(clearCompletedAtom)
  
  if (!hasTodos) return null
  
  return (
    <footer className="footer">
      <span className="todo-count">
        <strong>{activeCount}</strong> {activeCount === 1 ? 'item' : 'items'} left
      </span>
      <ul className="filters">
        <li>
          <a href="#/" className={filter === 'all' ? 'selected' : ''}>All</a>
        </li>
        <li>
          <a href="#/active" className={filter === 'active' ? 'selected' : ''}>Active</a>
        </li>
        <li>
          <a href="#/completed" className={filter === 'completed' ? 'selected' : ''}>Completed</a>
        </li>
      </ul>
      {hasCompleted && (
        <button className="clear-completed" onClick={() => clearCompleted()}>
          Clear completed
        </button>
      )}
    </footer>
  )
}
```

### App.tsx - Routing

```tsx
function App() {
  const setFilter = useAtomSet(filterAtom)
  
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash
      if (hash === '#/active') setFilter('active')
      else if (hash === '#/completed') setFilter('completed')
      else setFilter('all')
    }
    
    window.addEventListener('hashchange', handleHashChange)
    handleHashChange() // Initial route
    
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [setFilter])
  
  return (
    <section className="todoapp">
      <Header />
      <TodoList />
      <Footer />
    </section>
  )
}
```

## CSS

Import TodoMVC CSS:
```tsx
import 'todomvc-app-css/index.css'
```

Or copy from https://github.com/nicnocquee/todomvc-app-css

## Verification

```bash
cd todomvc && pnpm dev
# Test all interactions manually
```

## Notes

- Use `classnames` package for className conditionals
- No forwardRef (React 19+ - pass ref as prop if needed)
- Focus management: auto-focus edit input, new todo input
