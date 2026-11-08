import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { playTickSound, playVanishSound, playTouchSound, playWinSound } from './utils/audio';
import Modal from './components/Modal';

// 9개 스폿 고유 파스텔/네온 컬러 팔레트
const SPOT_COLORS = [
  { border: 'border-cyan-400', bg: 'bg-cyan-500/20', activeBg: 'bg-cyan-400', glow: 'rgba(34, 211, 238, 0.9)' },
  { border: 'border-fuchsia-400', bg: 'bg-fuchsia-500/20', activeBg: 'bg-fuchsia-400', glow: 'rgba(232, 121, 249, 0.9)' },
  { border: 'border-emerald-400', bg: 'bg-emerald-500/20', activeBg: 'bg-emerald-400', glow: 'rgba(52, 211, 153, 0.9)' },
  { border: 'border-amber-400', bg: 'bg-amber-500/20', activeBg: 'bg-amber-400', glow: 'rgba(251, 191, 36, 0.9)' },
  { border: 'border-rose-400', bg: 'bg-rose-500/20', activeBg: 'bg-rose-400', glow: 'rgba(251, 113, 133, 0.9)' },
  { border: 'border-violet-400', bg: 'bg-violet-500/20', activeBg: 'bg-violet-400', glow: 'rgba(167, 139, 250, 0.9)' },
  { border: 'border-lime-400', bg: 'bg-lime-500/20', activeBg: 'bg-lime-400', glow: 'rgba(163, 230, 53, 0.9)' },
  { border: 'border-sky-400', bg: 'bg-sky-500/20', activeBg: 'bg-sky-400', glow: 'rgba(56, 189, 248, 0.9)' },
  { border: 'border-pink-400', bg: 'bg-pink-500/20', activeBg: 'bg-pink-400', glow: 'rgba(244, 114, 182, 0.9)' },
];

export default function App() {
  // 상태: 'idle' (대기) | 'countdown' (3초 소리 카운트다운) | 'eliminating' (스폿 소멸) | 'result' (결과 발표)
  const [gameState, setGameState] = useState('idle');
  
  // 현재 눌려 있는 스폿 세트 (스폿 인덱스 0~8)
  const [pressedSpots, setPressedSpots] = useState(new Set());
  
  // 참여가 확정된 스폿들 (카운트다운 종료 시점)
  const [participatingSpots, setParticipatingSpots] = useState(new Set());
  
  // 당첨된 스폿 번호
  const [winnerSpot, setWinnerSpot] = useState(null);

  // 모달 상태
  const [modalInfo, setModalInfo] = useState({ isOpen: false, title: '', message: '' });

  // 5초 유지 타이머 ref 및 리셋 락 ref
  const resultTimerRef = useRef(null);
  const countdownIntervalRef = useRef(null);
  const spotRefs = useRef([]);

  // 터치 위치와 스폿 엘리먼트 매핑을 위한 좌표 추적
  const updateTouchPoints = useCallback((touchList) => {
    if (gameState === 'result' || gameState === 'eliminating') return;

    const newPressed = new Set();
    const spots = spotRefs.current;

    for (let i = 0; i < touchList.length; i++) {
      const touch = touchList[i];
      for (let sIdx = 0; sIdx < 9; sIdx++) {
        const el = spots[sIdx];
        if (!el) continue;
        const rect = el.getBoundingClientRect();
        // 터치 영역에 여유 반경 부여
        const padding = 10;
        if (
          touch.clientX >= rect.left - padding &&
          touch.clientX <= rect.right + padding &&
          touch.clientY >= rect.top - padding &&
          touch.clientY <= rect.bottom + padding
        ) {
          newPressed.add(sIdx);
          break;
        }
      }
    }

    setPressedSpots((prev) => {
      // 새로운 터치가 감지되면 소리
      newPressed.forEach((idx) => {
        if (!prev.has(idx)) {
          playTouchSound(idx);
        }
      });
      return newPressed;
    });
  }, [gameState]);

  // 마우스 클릭 또는 개별 포인터 이벤트 핸들러
  const handleSpotPointerDown = (index, e) => {
    if (gameState === 'result' || gameState === 'eliminating') return;
    e.stopPropagation();
    try {
      e.target.setPointerCapture?.(e.pointerId);
    } catch (err) {}

    setPressedSpots((prev) => {
      const next = new Set(prev);
      if (!next.has(index)) {
        playTouchSound(index);
      }
      next.add(index);
      return next;
    });
  };

  const handleSpotPointerUp = (index, e) => {
    if (gameState === 'result' || gameState === 'eliminating') return;
    try {
      e.target.releasePointerCapture?.(e.pointerId);
    } catch (err) {}

    setPressedSpots((prev) => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  };

  // 게임 시작 버튼 클릭 (추첨 준비)
  const handleStart = (e) => {
    e?.stopPropagation();
    setWinnerSpot(null);
    setParticipatingSpots(new Set());
    setGameState('countdown');
    playTickSound(600);

    let currentCount = 3;
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    countdownIntervalRef.current = setInterval(() => {
      currentCount -= 1;
      if (currentCount > 0) {
        // 숫자 표시 없이 소리로만 카운트
        playTickSound(600 + (3 - currentCount) * 150);
      } else {
        clearInterval(countdownIntervalRef.current);
        finishCountdown();
      }
    }, 1000);
  };

  // 3초 소리 카운트다운 종료 시점 로직 (스폿 먼저 소멸 후 당첨자 추첨)
  const finishCountdown = () => {
    setPressedSpots((currentPressed) => {
      const activeList = Array.from(currentPressed);

      // 아무도 누르지 않았을 경우
      if (activeList.length === 0) {
        playVanishSound();
        setGameState('idle');
        setModalInfo({
          isOpen: true,
          title: '참여자 없음',
          message: '스폿을 누르고 있는 손가락이 감지되지 않았습니다.\n3초 안에 원하는 스폿에 손가락을 올려주세요!',
        });
        return new Set();
      }

      // 1단계: 미참여 스폿 먼저 소멸
      playVanishSound();
      setParticipatingSpots(new Set(activeList));
      setGameState('eliminating');

      // 2단계: 손가락을 올리지 않은 스폿이 모두 사라진 후(약 500ms 뒤) 당첨자 선정
      setTimeout(() => {
        const luckyIndex = activeList[Math.floor(Math.random() * activeList.length)];
        setWinnerSpot(luckyIndex);
        setGameState('result');

        // 화려한 당첨 효과음 및 컨페티
        playWinSound();
        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.6 },
          colors: ['#facc15', '#38bdf8', '#f43f5e', '#a855f7'],
        });

        // 결과 5초 동안 확실하게 유지
        if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
        resultTimerRef.current = setTimeout(() => {
          // 5초 경과 후에도 화면을 터치하기 전까지 유지
        }, 5000);
      }, 500);

      return currentPressed;
    });
  };

  // 전체 화면 터치/클릭 시 결과 상태에서 초기화
  const handleScreenTouch = () => {
    if (gameState === 'result') {
      resetGame();
    }
  };

  // 게임 초기화
  const resetGame = () => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    if (resultTimerRef.current) clearTimeout(resultTimerRef.current);
    setGameState('idle');
    setWinnerSpot(null);
    setParticipatingSpots(new Set());
    setPressedSpots(new Set());
  };

  // 글로벌 터치 이벤트 등록 (손가락 미끄러짐 방지 및 멀티터치 감지)
  useEffect(() => {
    const handleGlobalTouch = (e) => {
      if (gameState === 'result') return;
      updateTouchPoints(e.touches);
    };

    window.addEventListener('touchstart', handleGlobalTouch, { passive: true });
    window.addEventListener('touchmove', handleGlobalTouch, { passive: true });
    window.addEventListener('touchend', handleGlobalTouch, { passive: true });
    window.addEventListener('touchcancel', handleGlobalTouch, { passive: true });

    return () => {
      window.removeEventListener('touchstart', handleGlobalTouch);
      window.removeEventListener('touchmove', handleGlobalTouch);
      window.removeEventListener('touchend', handleGlobalTouch);
      window.removeEventListener('touchcancel', handleGlobalTouch);
    };
  }, [gameState, updateTouchPoints]);

  return (
    <div
      onClick={handleScreenTouch}
      className="relative w-screen h-screen bg-neutral-950 flex items-center justify-center overflow-hidden select-none p-4"
    >
      {/* 배경 장식 은은한 그리드/비네트 */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(30,41,59,0.5)_0%,rgba(10,10,10,0.95)_100%)] pointer-events-none" />

      {/* 중앙 핵심 콘텐츠 컨테이너 */}
      <div
        className="relative z-10 flex flex-col items-center justify-center w-full max-w-[380px] min-h-[420px]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. 시작 전 (idle) 화면: 스폿을 숨기고 설명과 추첨 준비 버튼만 중앙에 배치 */}
        {gameState === 'idle' && (
          <div className="flex flex-col items-center justify-center text-center p-6 bg-neutral-900/60 rounded-3xl border border-neutral-800/80 shadow-2xl backdrop-blur-sm animate-fade-in w-full max-w-[320px]">
            <p className="text-[12px] text-neutral-200 font-medium mb-1.5 leading-relaxed">
              추첨 준비 버튼을 누른 후 3초 안에 원하는 스폿에 손가락을 올려주세요!
            </p>
            <p className="text-[11px] text-neutral-400 mb-6 font-normal">
              (모바일 전용)
            </p>
            <button
              type="button"
              onClick={handleStart}
              className="w-full py-3 px-6 rounded-2xl bg-neutral-100 hover:bg-white text-neutral-950 font-bold text-[12px] tracking-wider shadow-[0_0_20px_rgba(255,255,255,0.25)] hover:shadow-[0_0_28px_rgba(255,255,255,0.45)] active:scale-95 transition-all"
            >
              추첨 준비
            </button>
          </div>
        )}

        {/* 2. 게임 진행 (countdown, eliminating, result) 화면: 3x3 터치 스폿 그리드 노출 */}
        {gameState !== 'idle' && (
          <>
            <div className="grid grid-cols-3 gap-5 sm:gap-6 w-full aspect-square p-2 place-items-center animate-fade-in">
              {Array.from({ length: 9 }).map((_, index) => {
                const isPressed = pressedSpots.has(index);
                const isWinner = winnerSpot === index;
                const isParticipating = participatingSpots.has(index);
                const isVanish = (gameState === 'eliminating' || gameState === 'result') && !isParticipating;
                const color = SPOT_COLORS[index];

                return (
                  <div
                    key={index}
                    ref={(el) => (spotRefs.current[index] = el)}
                    onPointerDown={(e) => handleSpotPointerDown(index, e)}
                    onPointerUp={(e) => handleSpotPointerUp(index, e)}
                    onPointerCancel={(e) => handleSpotPointerUp(index, e)}
                    className={`relative flex items-center justify-center rounded-full transition-all duration-300 select-none
                      w-[72px] h-[72px] sm:w-[84px] sm:h-[84px]
                      ${isVanish ? 'opacity-0 scale-50 pointer-events-none' : 'opacity-100 scale-100'}
                      ${isPressed ? 'scale-95' : ''}
                    `}
                    style={{ touchAction: 'none' }}
                  >
                    {/* 당첨된 경우: 손가락에 가려져 있어도 주변을 강력하게 깜빡거리며 밝혀주는 다중 후광 링 */}
                    {isWinner && (
                      <>
                        {/* 초대형 외곽 깜빡임 링 1 */}
                        <div
                          className="absolute -inset-10 sm:-inset-14 rounded-full border-4 border-yellow-300 animate-winner-flash pointer-events-none z-30"
                          style={{
                            boxShadow: '0 0 50px 20px rgba(250, 204, 21, 0.9), inset 0 0 30px 10px rgba(250, 204, 21, 0.6)',
                          }}
                        />
                        {/* 외곽 파동 링 2 */}
                        <div
                          className="absolute -inset-16 sm:-inset-20 rounded-full border-2 border-amber-400 animate-ripple pointer-events-none z-20"
                        />
                        {/* 당첨자 텍스트 라벨 (스폿 바로 위로 돌출되어 손가락 위에서도 명확히 확인 가능) */}
                        <div className="absolute -top-7 sm:-top-8 px-2 py-0.5 rounded-full bg-yellow-400 text-neutral-900 font-extrabold text-[11px] shadow-lg animate-bounce pointer-events-none z-40 whitespace-nowrap">
                          ★ 당첨 ★
                        </div>
                      </>
                    )}

                    {/* 눌려 있을 때 외곽 펄스 링 */}
                    {isPressed && !isWinner && (
                      <div
                        className="absolute -inset-3 rounded-full border border-sky-400/60 animate-ping opacity-60 pointer-events-none"
                        style={{ borderColor: color.glow }}
                      />
                    )}

                    {/* 본체 스폿 원형 버튼 */}
                    <div
                      style={{
                        boxShadow: isWinner
                          ? '0 0 35px rgba(250,204,21,1)'
                          : isPressed
                          ? `0 0 25px ${color.glow}`
                          : undefined,
                      }}
                      className={`w-full h-full rounded-full border-2 flex items-center justify-center transition-all duration-200 cursor-pointer
                        ${isWinner
                          ? 'bg-yellow-400 border-yellow-200 text-neutral-900'
                          : isPressed
                          ? `${color.activeBg} ${color.border} text-white`
                          : `${color.bg} ${color.border} text-neutral-400 hover:border-neutral-200 active:scale-95`
                        }
                      `}
                    >
                      {/* 중앙 원형 코어 인디케이터 */}
                      <div
                        className={`w-3.5 h-3.5 rounded-full transition-transform duration-200 ${
                          isWinner
                            ? 'bg-neutral-900 scale-125'
                            : isPressed
                            ? 'bg-white scale-150'
                            : 'bg-white/40'
                        }`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* 하단 진행 상태 안내 */}
            <div className="mt-8 flex flex-col items-center justify-center min-h-[50px] text-center w-full px-2">
              {gameState === 'countdown' && (
                <div className="flex flex-col items-center animate-pulse">
                  <span className="text-[12px] font-medium text-amber-300 tracking-tight">
                    원하는 스폿에 손가락을 올려주세요!
                  </span>
                </div>
              )}

              {gameState === 'eliminating' && (
                <div className="flex flex-col items-center animate-pulse">
                  <span className="text-[12px] font-medium text-neutral-400 tracking-tight">
                    추첨 진행 중...
                  </span>
                </div>
              )}

              {gameState === 'result' && (
                <div
                  onClick={resetGame}
                  className="flex flex-col items-center cursor-pointer animate-fade-in text-center"
                >
                  <div className="text-[12px] font-semibold text-yellow-300 drop-shadow-[0_0_10px_rgba(253,224,71,0.6)]">
                    당첨자 탄생!
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-1">
                    화면을 터치하면 다시 시작합니다
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* 안내 모달창 (alert 대체) */}
      <Modal
        isOpen={modalInfo.isOpen}
        title={modalInfo.title}
        message={modalInfo.message}
        onClose={() => setModalInfo({ isOpen: false, title: '', message: '' })}
        confirmText="확인"
      />
    </div>
  );
}

