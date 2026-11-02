import { useEffect, useRef, useState } from "react";

const WS_URL = "ws://localhost:8000/ws";

function formatTime(timestamp) {
  return new Date(timestamp).toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function App() {
  const [username, setUsername] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [messageInput, setMessageInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState("Не подключен");
  const [error, setError] = useState("");
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => socketRef.current?.close();
  }, []);

  function connect(event) {
    event.preventDefault();
    const cleanName = nameInput.trim();

    if (!cleanName || socketRef.current) return;

    setError("");
    const socket = new WebSocket(
      `${WS_URL}/${encodeURIComponent(cleanName)}`,
    );
    socketRef.current = socket;
    setConnectionStatus("Подключение...");

    socket.onopen = () => {
      setMessages([]);
      setUsername(cleanName);
      setConnectionStatus("В сети");
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setMessages((currentMessages) => [...currentMessages, message]);
    };

    socket.onerror = () => {
      setError("Нет связи с сервером. Проверьте, что backend запущен на порту 8000.");
    };

    socket.onclose = (event) => {
      setConnectionStatus("Не подключен");
      setUsername("");
      if (event.code === 1008) setError(event.reason);
      else if (!event.wasClean) setError("Соединение потеряно. Попробуйте войти снова.");
      socketRef.current = null;
    };
  }

  function disconnect() {
    socketRef.current?.close();
  }

  function sendMessage(event) {
    event.preventDefault();
    const text = messageInput.trim();

    if (!text || socketRef.current?.readyState !== WebSocket.OPEN) return;

    socketRef.current.send(JSON.stringify({ text }));
    setMessageInput("");
  }

  if (!username) {
    return (
      <main className="page page-center">
        <section className="join-card">
          <div className="logo">💬</div>
          <p className="eyebrow">Python + React</p>
          <h1>Чат в реальном времени</h1>
          <p className="muted">
            Представьтесь, чтобы подключиться к общему чату.
          </p>
          <form className="join-form" onSubmit={connect}>
            <label htmlFor="username">Ваше имя</label>
            <input
              id="username"
              value={nameInput}
              onChange={(event) => setNameInput(event.target.value)}
              placeholder="Например, Анна"
              maxLength={30}
              autoFocus
            />
            <button
              type="submit"
              disabled={!nameInput.trim() || connectionStatus === "Подключение..."}
            >
              {connectionStatus === "Подключение..." ? "Подключение..." : "Войти в чат"}
            </button>
          </form>
          {error && <p className="error" role="alert">{error}</p>}
        </section>
      </main>
    );
  }

  return (
    <main className="page">
      <section className="chat-card">
        <header className="chat-header">
          <div>
            <p className="eyebrow">Общий канал</p>
            <h1>Чат в реальном времени</h1>
          </div>
          <div className="user-panel">
            <span className="online-dot" />
            <span>{username}</span>
            <button className="logout-button" onClick={disconnect}>
              Выйти
            </button>
          </div>
        </header>

        <div className="messages" aria-live="polite">
          {messages.length === 0 && (
            <p className="empty-state">Пока нет сообщений. Напишите первым!</p>
          )}
          {messages.map((message, index) =>
            message.type === "system" ? (
              <div className="message system-message" key={`${message.timestamp}-${index}`}>
                <span>{message.text}</span>
                <time>{formatTime(message.timestamp)}</time>
              </div>
            ) : (
              <div
                className={`message ${
                  message.username === username ? "own-message" : ""
                }`}
                key={`${message.timestamp}-${index}`}
              >
                <div className="message-meta">
                  <strong>{message.username}</strong>
                  <time>{formatTime(message.timestamp)}</time>
                </div>
                <p>{message.text}</p>
              </div>
            ),
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="message-form" onSubmit={sendMessage}>
          <input
            aria-label="Сообщение"
            value={messageInput}
            onChange={(event) => setMessageInput(event.target.value)}
            placeholder="Напишите сообщение..."
            maxLength={500}
            autoFocus
          />
          <button type="submit" disabled={!messageInput.trim()}>Отправить</button>
        </form>
        <footer className="status-line">
          <span className="online-dot" />
          {connectionStatus}
        </footer>
      </section>
    </main>
  );
}

export default App;
