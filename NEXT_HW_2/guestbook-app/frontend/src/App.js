import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
    const [name, setName] = useState('');
    const [message, setMessage] = useState('');
    const [password, setPassword] = useState('');
    const [guestbookEntries, setGuestbookEntries] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [showPopup, setShowPopup] = useState(false); // 팝업 상태 추가
    const [likeCount, setLikeCount] = useState(0); // like_count 상태 추가
    const [userId, setUserId] = useState(Math.floor(Math.random() * 1000000)); // 임시 사용자 ID

    useEffect(() => {
        fetchEntries();
    }, []);

    const fetchEntries = () => {
        fetch('http://localhost:3001/api/guestbook')
            .then((response) => response.json())
            .then((data) => {
                if (Array.isArray(data)) {
                    setGuestbookEntries(data);
                } else {
                    console.error('Received invalid data:', data);
                    setGuestbookEntries([]);
                }
            })
            .catch((error) => console.error('Error fetching entries:', error));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        fetch('http://localhost:3001/api/guestbook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ name, message, password }),
        })
            .then((response) => response.json())
            .then((newEntry) => {
                setGuestbookEntries([newEntry, ...guestbookEntries]);
                setName('');
                setMessage('');
                setPassword('');
            });
    };

    const handleDelete = (id) => {
        const userPassword = prompt('비밀번호를 입력하세요:');
        fetch(`http://localhost:3001/api/guestbook/${id}`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ password: userPassword }),
        }).then((response) => {
            if (response.status === 403) {
                alert('비밀번호가 일치하지 않습니다.');
            } else {
                setGuestbookEntries(guestbookEntries.filter((entry) => entry.id !== id));
            }
        });
    };

    const handleEdit = (id) => {
        const newMessage = prompt('수정할 메시지를 입력하세요:');
        const userPassword = prompt('비밀번호를 입력하세요:');
        fetch(`http://localhost:3001/api/guestbook/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: newMessage, password: userPassword }),
        }).then((response) => {
            if (response.status === 403) {
                alert('비밀번호가 일치하지 않습니다.');
            } else {
                response.json().then((updatedEntry) => {
                    setGuestbookEntries(guestbookEntries.map((entry) => (entry.id === id ? updatedEntry : entry)));
                });
            }
        });
    };

    const handleLike = (id) => {
        console.log('Sending userId:', userId); // userId를 콘솔에 출력
        fetch(`http://localhost:3001/api/guestbook/${id}/like`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId }), // userId 포함 여부 확인
        })
            .then((response) => {
                if (!response.ok) {
                    alert('욕심은 금물, 도전은 1인 1회입니다.');
                    throw new Error('already liked');
                }
                return response.json();
            })
            .then((data) => {
                updateLikeCount(id, data.like_count); // 좋아요 수 업데이트
                setLikeCount(data.like_count); // likeCount 업데이트
                setShowPopup(true); // 팝업 표시
            })
            .catch((error) => console.error('Error liking entry:', error));
    };
    // 좋아요 수를 업데이트하는 함수
    const updateLikeCount = (id, newCount) => {
        // guestbook entry 중 id가 일치하는 항목의 like_count를 업데이트
        setGuestbookEntries((prevEntries) =>
            prevEntries.map((entry) => (entry.id === id ? { ...entry, like_count: newCount } : entry))
        );
    };

    const handleSearch = (e) => {
        e.preventDefault();
        fetch(`http://localhost:3001/api/guestbook/search?query=${searchQuery}`)
            .then((response) => response.json())
            .then((data) => {
                if (data.length === 0) {
                    alert(`"${searchQuery}"를 포함한 결과가 없습니다.`);
                } else {
                    setGuestbookEntries(data);
                }
            })
            .catch((error) => {
                console.error('검색 중 오류 발생:', error);
                alert('검색 중 오류가 발생했습니다.');
            });
    };

    const closePopup = () => {
        setShowPopup(false); // 팝업 닫기
    };

    return (
        <div className="App">
            <div className="App1">
                <h1>🥕어떤 나눔을 하고 싶으세요?🥕</h1>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        placeholder="title"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                    <textarea
                        placeholder="detail"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        required
                    />
                    <input
                        type="password"
                        placeholder="비밀번호"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                    <button type="submit">선물 투척</button>
                </form>
            </div>
            <div className="App1">
                <h2>지금 진행 중인 무료 나눔 🎁</h2>
                <form onSubmit={handleSearch}>
                    <input
                        type="text"
                        placeholder="검색어"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                    <button type="submit">검색</button>
                </form>
                <ul>
                    {guestbookEntries.map((entry) => (
                        <li key={entry.id}>
                            <strong>{entry.name}:</strong> {entry.message} <br />
                            <small>{new Date(entry.created_at).toLocaleString()}</small> <br />
                            <button onClick={() => handleEdit(entry.id)}>Edit</button>
                            <button onClick={() => handleDelete(entry.id)}>Delete</button>
                            <button onClick={() => handleDelete(entry.id)}>DM</button>
                            <br /> <br />
                            <button claaName="luck" onClick={() => handleLike(entry.id)}>
                                🍀
                            </button>
                        </li>
                    ))}
                </ul>
                {/* 팝업창 */}
                {showPopup && (
                    <div className="popup">
                        <div className="popup-content">
                            <h1>🍀</h1>
                            <h2>{likeCount}번째 네잎클로버</h2>
                            <h3>게시글 속 행운의 네잎클로버 주인공인지 지금 바로 확인하러 가보세요!</h3>
                            <button onClick={closePopup} className="popup-close-button">
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default App;
