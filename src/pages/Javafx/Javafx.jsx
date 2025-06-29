import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

function useStoredState(key, initial) {
  const [value, setValue] = useState(() => {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : initial;
  });
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);
  return [value, setValue];
}

export default function JavafxPage() {
  const navigate = useNavigate();
  const [user] = useState(() => {
    const u = localStorage.getItem('javafxUser');
    return u ? JSON.parse(u) : null;
  });

  const [posts, setPosts] = useStoredState('javafxPosts', []);
  const [question, setQuestion] = useState('');
  const [image, setImage] = useState(null);
  const [sort, setSort] = useState('recent');

  useEffect(() => {
    if (!user) navigate('/javafx/login');
  }, [user, navigate]);

  const addPost = () => {
    if (!question.trim()) return;
    const newPost = {
      id: Date.now(),
      text: question,
      image,
      user: user.username,
      upvotes: 0,
      created: Date.now(),
      correctAnswerId: null,
      answers: []
    };
    setPosts([newPost, ...posts]);
    setQuestion('');
    setImage(null);
  };

  const addAnswer = (pid, text, img) => {
    setPosts(posts.map(p => {
      if (p.id === pid) {
        const ans = {
          id: Date.now(),
          text,
          image: img,
          user: user.username,
          upvotes: 0
        };
        return { ...p, answers: [...p.answers, ans] };
      }
      return p;
    }));
  };

  const upvotePost = id => {
    setPosts(posts.map(p => p.id === id ? { ...p, upvotes: p.upvotes + 1 } : p));
  };

  const upvoteAnswer = (pid, aid) => {
    setPosts(posts.map(p => {
      if (p.id === pid) {
        return {
          ...p,
          answers: p.answers.map(a => a.id === aid ? { ...a, upvotes: a.upvotes + 1 } : a)
        };
      }
      return p;
    }));
  };

  const markCorrect = (pid, aid) => {
    setPosts(posts.map(p => {
      if (p.id === pid) {
        return { ...p, correctAnswerId: aid };
      }
      return p;
    }));
  };

  const displayPosts = (() => {
    if (sort === 'popular') {
      return [...posts].sort((a,b) => b.upvotes - a.upvotes);
    }
    if (sort === 'answered') {
      return posts.filter(p => p.correctAnswerId);
    }
    if (sort === 'not-answered') {
      return posts.filter(p => !p.correctAnswerId);
    }
    return [...posts].sort((a,b) => b.created - a.created);
  })();

  const handleImage = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setImage(ev.target.result);
    reader.readAsDataURL(file);
  };

  if (!user) return null;

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '1rem' }}>
      <h2 style={{ marginBottom: '1rem', textAlign: 'center' }}>JavaFX Discussion</h2>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
        <input
          style={{ flex: 1 }}
          value={question}
          onChange={e => setQuestion(e.target.value)}
          placeholder="Ask a question"
        />
        <input type="file" accept="image/*" onChange={handleImage} />
        <button onClick={addPost}>Post</button>
      </div>
      <div style={{ marginBottom: '1rem' }}>
        <label>Sort: </label>
        <select value={sort} onChange={e => setSort(e.target.value)}>
          <option value="recent">Recent</option>
          <option value="popular">Popular</option>
          <option value="answered">Answered</option>
          <option value="not-answered">Not Answered</option>
        </select>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {displayPosts.map(post => (
          <Post
            key={post.id}
            post={post}
            currentUser={user.username}
            addAnswer={addAnswer}
            upvotePost={upvotePost}
            upvoteAnswer={upvoteAnswer}
            markCorrect={markCorrect}
          />
        ))}
      </div>
    </div>
  );
}

function Post({ post, currentUser, addAnswer, upvotePost, upvoteAnswer, markCorrect }) {
  const [reply, setReply] = useState('');
  const [img, setImg] = useState(null);
  const [show, setShow] = useState(false);

  const handleImg = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => setImg(ev.target.result);
    reader.readAsDataURL(file);
  };

  const submit = e => {
    e.preventDefault();
    if (!reply.trim()) return;
    addAnswer(post.id, reply, img);
    setReply('');
    setImg(null);
  };

  return (
    <div style={{ border: '1px solid #ccc', padding: '0.5rem' }}>
      <div>
        <p>{post.text}</p>
        {post.image && <img src={post.image} alt="attachment" style={{ maxWidth: '100%' }} />}
        <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.9rem' }}>
          <span>by {post.user}</span>
          <span>{post.upvotes} upvotes</span>
          <button onClick={() => upvotePost(post.id)}>Upvote</button>
          <button onClick={() => setShow(!show)}>Replies ({post.answers.length})</button>
        </div>
      </div>
      {show && (
        <div style={{ marginTop: '0.5rem', paddingLeft: '1rem', borderLeft: '2px solid #ddd' }}>
          {post.answers.map(a => (
            <div key={a.id} style={{ marginBottom: '0.5rem' }}>
              <p>{a.text}</p>
              {a.image && <img src={a.image} alt="attachment" style={{ maxWidth: '100%' }} />}
              <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.8rem' }}>
                <span>by {a.user}</span>
                <span>{a.upvotes} upvotes</span>
                <button onClick={() => upvoteAnswer(post.id, a.id)}>Upvote</button>
                {currentUser === post.user && post.correctAnswerId === null && (
                  <button onClick={() => markCorrect(post.id, a.id)}>Mark Correct</button>
                )}
                {post.correctAnswerId === a.id && <span>✔</span>}
              </div>
            </div>
          ))}
          <form onSubmit={submit} style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              style={{ flex: 1 }}
              value={reply}
              onChange={e => setReply(e.target.value)}
              placeholder="Write a reply"
            />
            <input type="file" accept="image/*" onChange={handleImg} />
            <button type="submit">Reply</button>
          </form>
        </div>
      )}
    </div>
  );
}