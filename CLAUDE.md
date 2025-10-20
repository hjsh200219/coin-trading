# CLAUDE.md

이 파일은 Claude Code (claude.ai/code)가 이 저장소에서 작업할 때 참고하는 가이드입니다.

## 🔴 중요 규칙 (CRITICAL RULES)

### 언어 설정
- **모든 답변은 한글로 작성**

### 데이터베이스 보호
- **절대 금지**: 데이터베이스 초기화 또는 전체 삭제 작업
- **절대 금지**: DROP TABLE, TRUNCATE TABLE 등 데이터 손실 가능성이 있는 SQL 실행
- **허용**: 개별 컬럼 추가 ALTER TABLE 명령어
- **허용**: 인덱스 생성/삭제
- **반드시 확인**: 중요한 스키마 변경 전 사용자 승인 필요

### 코드 품질 절대 규칙
- **🚫 ESLint Disable 절대 금지**:
  - `eslint-disable`, `eslint-disable-line`, `eslint-disable-next-line` 절대 사용 금지
  - `// @ts-ignore`, `// @ts-nocheck` 등 TypeScript 체크 비활성화 금지
  - **모든 린트 에러는 반드시 코드 수정으로만 해결**
- 코드 수정 후에는 반드시 `npm run lint` 실행하여 에러 확인 및 수정
- 린트 에러가 있는 상태로 작업 완료 금지

### 파일 구조 규칙
- **SQL 파일 관리**:
  - 모든 Supabase SQL 파일은 `sql/` 폴더에 저장
  - 마이그레이션 파일명: `YYYYMMDD_description.sql` 형식 사용
  - 파일 내 주석으로 목적과 의존성 명시

- **UI 컴포넌트 규칙**:
  - **필수**: UI 요소 구현 시 `src/components/ui/` 폴더의 공통 컴포넌트 우선 사용
  - 필요한 컴포넌트가 없을 경우 `src/components/ui/`에 새로운 공통 컴포넌트 생성
  - 페이지별 특화 컴포넌트만 페이지 디렉토리에 위치
  - 공통 UI 컴포넌트는 variant, size 등의 props로 다양한 케이스 지원

- **문서 관리**:
  - 모든 PRD(Product Requirement Document) 파일은 `.docs/` 폴더에 저장
  - 기능 명세서, 요구사항 문서, 설계 문서 등 프로젝트 문서화
  - 파일명: `YYYYMMDD_feature_name.md` 형식 권장

## 개발 명령어

```bash
# 개발 서버
npm run dev              # 개발 서버 시작 (http://localhost:3000)

# 빌드 & 프로덕션
npm run build           # 프로덕션 빌드
npm start               # 프로덕션 서버 시작

# 린팅
npm run lint            # ESLint 실행

# 캐시 삭제 (핫 리로드 실패 시)
rm -rf .next && npm run dev

# 모든 개발 서버 종료
for port in 3000 3001 3002 4000 5000 5173 8000 8080 8081 9000; do
  lsof -ti:$port | xargs kill -9 2>/dev/null
done
```

## Git 워크플로우

### "git push" 자동화 규칙
사용자가 **"git push"** 또는 **"push"**라고 입력하면:
1. **자동으로 다음 작업 수행**:
   - `git add .` - 모든 변경사항 스테이징
   - `git commit -m "적절한 커밋 메시지"` - 의미 있는 커밋 메시지로 커밋
   - `git push` - 원격 저장소에 push

2. **커밋 메시지 작성 규칙**:
   - 변경사항을 분석하여 명확하고 구조화된 커밋 메시지 자동 생성
   - 형식: `feat:`, `fix:`, `refactor:`, `docs:` 등의 접두사 사용
   - 주요 변경사항을 bullet point로 정리

3. **주의사항**:
   - 사용자 확인 없이 자동으로 진행
   - 커밋 전 lint, tsc, build 체크는 이미 완료된 것으로 가정
   - 에러 발생 시 사용자에게 보고

## 아키텍처 개요

### 기술 스택
- **프레임워크**: Next.js 15 (App Router) with React Server Components
- **언어**: TypeScript (strict mode)
- **스타일링**: Tailwind CSS (커스텀 다크 테마 - Supabase 스타일)
- **데이터베이스**: Supabase (PostgreSQL)
- **인증**: Supabase Auth (Google OAuth)
- **차트 라이브러리**: Lightweight Charts, Recharts
- **기술 지표**: technicalindicators (RSI, MACD, Bollinger Bands 등)
- **배포**: Vercel

### 거래소 통합 아키텍처

**다중 거래소 지원**:
- **Bithumb**: WebSocket 실시간 데이터 + REST API
- **Upbit**: REST API (현재가, 캔들 데이터)
- **Binance**: REST API (글로벌 시세)

**아키텍처 패턴**:
```
src/lib/
├── bithumb/
│   ├── api.ts          # REST API 클라이언트
│   └── types.ts        # Bithumb 타입 정의
├── upbit/
│   ├── api.ts          # REST API 클라이언트
│   └── types.ts        # Upbit 타입 정의
└── binance/
    ├── api.ts          # REST API 클라이언트
    └── types.ts        # Binance 타입 정의
```

**공통 패턴**:
- 각 거래소는 독립적인 API 클라이언트와 에러 타입 (`{Exchange}APIError`)
- 공통 `Candle` 타입으로 데이터 정규화 (`convertToCommonCandles`)
- `next: { revalidate: 10 }`으로 10초마다 자동 재검증

**실시간 데이터**:
- Bithumb만 WebSocket 지원 (`useBithumbWebSocket` 훅)
- Upbit/Binance는 수동 새로고침 또는 폴링 방식

### 시간대 처리 규칙

**한국 표준시(KST) 필수**:
- 모든 시간 표시는 `toLocaleTimeString('ko-KR', { timeZone: 'Asia/Seoul' })` 사용
- 마지막 업데이트 시간에 "KST" 명시
- 차트 데이터의 타임스탬프는 UTC → KST 변환 필요

### 인증 플로우

1. **OAuth 로그인** (`/login`): Supabase Auth를 통한 Google OAuth
2. **인증 콜백** (`/app/auth/callback/route.ts`):
   - 코드를 세션으로 교환
   - `user_profiles` 레코드가 없으면 자동 생성 (기본값 `user_type: 'quest'`)
3. **보호된 라우트**: `/login`을 제외한 모든 페이지는 `AppLayout`을 통한 인증 필요

### 사용자 타입 시스템

세 가지 사용자 타입과 권한 수준:
- `admin`: `/admin` 사용자 관리 포함 전체 접근 권한
- `member`: 일반 인증 사용자
- `quest`: 신규 사용자 기본값 (게스트 레벨)

사용자 타입은 `user_profiles` 테이블에 저장되며 RLS 정책으로 강제됩니다.

### 레이아웃 아키텍처

**중앙 집중식 레이아웃 패턴**:
- `AppLayout` 컴포넌트가 모든 인증된 페이지를 감싸기
- 인증 체크 처리 및 미인증 시 `/login`으로 리다이렉트
- 사용자 프로필을 가져와서 `Navigation`에 전달
- 모든 페이지에 일관된 max-width (`max-w-7xl`) 설정
- 모든 페이지는 `<AppLayout>{content}</AppLayout>` 래퍼 사용

**네비게이션 시스템**:
- 반응형 디자인: 데스크톱 가로 메뉴, 모바일 햄버거 드롭다운
- 동적 페이지 타이틀: 홈에서는 "Coin Trading", 다른 라우트에서는 페이지 이름 표시
- `parent` 속성으로 계층적 타이틀 지원: "메인 > 서브"
- 관리자 메뉴 항목은 `user_type: 'admin'`일 때만 표시
- 데스크톱 및 모바일 뷰 모두에 로그아웃 기능 통합

### Supabase 클라이언트 패턴

**두 가지 클라이언트 타입**:
1. **서버 클라이언트** (`@/lib/supabase/server`): Server Components와 Server Actions용
   - 쿠키 통합과 함께 `createServerClient` 사용
   - 비동기 함수: `await createClient()`

2. **브라우저 클라이언트** (`@/lib/supabase/client`): Client Components용
   - `createBrowserClient` 사용
   - 동기 함수: `createClient()`

**사용법**:
- Server Components: 항상 서버 클라이언트 사용
- Client Components: 클라이언트 측 작업에 브라우저 클라이언트 사용
- Server Actions: 변경 작업에 서버 클라이언트 사용

### 컴포넌트 아키텍처

**3계층 컴포넌트 구조**:

1. **레이아웃 컴포넌트** (`src/components/`):
   - `AppLayout`: 인증 + 네비게이션을 포함한 중앙 집중식 레이아웃
   - `Navigation`: 사용자 정보와 로그아웃이 포함된 반응형 네비게이션

2. **UI 컴포넌트** (`src/components/ui/`):
   - 재사용 가능한 원자 컴포넌트: `Button`, `Input`, `Card`, `Tooltip`, `StatCard`
   - variant와 size props로 일관된 스타일링
   - 모든 컴포넌트는 Tailwind 테마 컬러 사용
   - **중요**: 새로운 UI 요소 필요 시 이 폴더에 공통 컴포넌트로 생성

3. **공통 비즈니스 컴포넌트** (`src/components/common/`):
   - `ExchangeSelector`: 거래소 선택 및 자동 갱신 제어
   - `ChartControls`: 차트 시간대/기간 제어
   - `ChartElements`: 차트 관련 UI 요소
   - `IndicatorValueGrid`: 기술 지표 값 표시 그리드
   - `IndicatorChartWrapper`: 지표 차트 래퍼
   - `UserTypeBadge`: 사용자 타입 뱃지
   - **특징**: 여러 페이지에서 공통으로 사용되는 비즈니스 로직 포함 컴포넌트

4. **도메인별 컴포넌트** (`src/components/{domain}/`):
   - `market/CoinCard`, `market/CoinList`: 마켓 페이지 전용
   - **규칙**: 특정 도메인에서만 사용되는 컴포넌트

5. **페이지별 컴포넌트**:
   - 페이지 디렉토리에 위치 (예: `/app/my-page/ProfileCard.tsx`)
   - **반드시** `ui/`와 `common/` 컴포넌트를 조합하여 구성
   - 해당 페이지에만 특화된 로직이 있을 때만 별도 컴포넌트 생성

**컴포넌트 선택 가이드**:
- UI 요소만 필요 → `ui/` 사용
- 비즈니스 로직 포함된 공통 기능 → `common/` 확인 후 재사용
- 여러 페이지에서 재사용 가능 → `common/`에 생성
- 특정 도메인 전용 → `{domain}/`에 생성
- 한 페이지에서만 사용 → 페이지 디렉토리에 생성

### 커스텀 훅 패턴

**데이터 관리 훅** (`src/hooks/`):

1. **`useExchangeData`**: 거래소 데이터 통합 관리
   - 거래소별 API 호출 통합
   - 로딩 상태, 에러 처리
   - 자동 새로고침 제어

2. **`useBithumbWebSocket`**: Bithumb WebSocket 실시간 연결
   - 연결 상태 관리 (`connecting`, `connected`, `disconnected`, `error`)
   - 자동 재연결 로직
   - 갱신 간격 제어 (1초, 3초, 5초, 10초)

3. **`useCandleData`**: 캔들 차트 데이터 관리
   - 시간대/기간별 데이터 요청
   - 캔들 데이터 정규화
   - 캐싱 및 재검증

**훅 사용 원칙**:
- 거래소 API 직접 호출 대신 훅 사용
- 상태 관리와 비즈니스 로직을 훅에 캡슐화
- 컴포넌트는 UI 렌더링에만 집중

### 기술 지표 시스템

**지표 계산** (`src/lib/indicators/calculator.ts`):
- `technicalindicators` 라이브러리 사용
- 지원 지표: RSI, MACD, Bollinger Bands, 이동평균, 스토캐스틱 등
- 입력: 캔들 데이터 배열
- 출력: 지표별 계산 결과

**차트 통합**:
- Lightweight Charts: 메인 가격 차트
- Recharts: 지표 차트 및 보조 차트
- 차트 타임프레임: `'30m' | '1h' | '2h' | '4h' | '1d'`
- 분석 기간: `'1M' | '3M' | '6M' | '1Y' | '2Y' | '3Y'`

**구현 우선순위** (`.docs/20250114_tradingview_indicators.md` 참조):
- Phase 1: SMA, EMA, RSI, Volume, MACD
- Phase 2: Bollinger Bands, VWAP, ATR, Stochastic, Disparity
- Phase 3: Ichimoku Cloud, Volume Profile, Fibonacci, Pivot Points

### TypeScript 경로 별칭

`src/`의 모든 임포트에 `@/*` 사용:
```typescript
import { createClient } from '@/lib/supabase/server'
import Button from '@/components/ui/Button'
import { useExchangeData } from '@/hooks/useExchangeData'
```

### 스타일링 시스템

**Tailwind 커스텀 테마** (기본 다크 모드):
```javascript
colors: {
  background: '#1c1c1c',      // 메인 배경
  foreground: '#ededed',       // 메인 텍스트
  brand: '#3ecf8e',           // 주요 강조색 (녹색)
  border: '#2e2e2e',          // 기본 테두리
  surface: {
    DEFAULT: '#181818',        // 카드 배경
    75: '#1f1f1f',
    100: '#262626',
  }
}
```

### Server Actions 패턴

변경 작업(프로필 업데이트, 관리자 작업)을 위한 Server Actions:
```typescript
const updateProfile = async (formData: FormData) => {
  'use server'
  // 서버 supabase 클라이언트 사용
  const supabase = await createClient()
  // 변경 작업 수행
  // revalidatePath()로 캐시 업데이트
  // redirect()로 네비게이션
}
```

로딩 상태가 있는 폼 제출:
```typescript
// 제출 버튼 컴포넌트에서 useFormStatus() 훅 사용
function SubmitButton() {
  const { pending } = useFormStatus()
  return <Button disabled={pending}>{pending ? '저장 중...' : '저장'}</Button>
}
```

### 이미지 설정

허용된 원격 이미지 도메인:
- `https://lh3.googleusercontent.com/a/**` (Google 프로필 사진)

새 도메인은 `next.config.js`의 `remotePatterns` 배열에 추가하세요.

## 주요 패턴

### 새로운 보호된 라우트 추가하기

1. `src/app/[route]/page.tsx`에 페이지 생성
2. `<AppLayout>`으로 컨텐츠 감싸기
3. `Navigation` navItems 배열에 라우트 추가
4. 선택사항: 서브메뉴 브레드크럼을 위한 `parent` 속성 추가

### 관리자 전용 기능

다음에서 `user_type === 'admin'` 확인:
- 네비게이션 메뉴 (조건부 렌더링)
- 페이지 레벨 접근 제어 (관리자가 아니면 리다이렉트)
- Server actions (변경 전 user_type 확인)

### Server Actions와 폼 패턴

```typescript
// page.tsx에서 (Server Component)
async function serverAction(formData: FormData) {
  'use server'
  const supabase = await createClient()
  // ... 변경 로직
  revalidatePath('/current-path')
  redirect('/current-path')
}

// 클라이언트 컴포넌트에 전달
<ClientForm action={serverAction} />

// ClientForm에서 (Client Component)
<form action={action}>
  <Input name="field" />
  <SubmitButton /> {/* useFormStatus 사용 */}
</form>
```

### 데이터베이스 스키마 규칙

- 테이블: `user_profiles` (`users`가 아님)
- 사용자 타입 enum: `'admin' | 'member' | 'quest'`
- 보안을 위해 항상 RLS 정책 포함
- 외래 키는 `auth.users(id)`를 참조하며 `ON DELETE CASCADE` 사용

### SQL 파일 관리

**파일 위치**: 모든 SQL 파일은 `sql/` 디렉토리에 저장

**파일 명명 규칙**:
```
sql/
├── YYYYMMDD_initial_schema.sql      # 초기 스키마
├── YYYYMMDD_add_user_types.sql      # 마이그레이션
└── YYYYMMDD_create_indexes.sql      # 인덱스 추가
```

**SQL 파일 구조**:
```sql
-- 파일 목적: 사용자 타입 변경
-- 의존성: user_profiles 테이블 필요
-- 작성일: 2024-01-01

-- 기존 제약 조건 삭제
ALTER TABLE user_profiles DROP CONSTRAINT IF EXISTS ...;

-- 데이터 마이그레이션
UPDATE user_profiles SET ...;

-- 새 제약 조건 추가
ALTER TABLE user_profiles ADD CONSTRAINT ...;
```

## 환경 변수

`.env.local`에 필수 항목:
```
NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

## 일반적인 문제

**핫 리로드가 작동하지 않을 때**:
```bash
rm -rf .next && npm run dev
```

**여러 개발 서버가 실행 중일 때**: 위의 포트 종료 명령어 사용

**인증 리다이렉트 루프**: `user_profiles` 테이블이 존재하고 RLS 정책이 읽기 접근을 허용하는지 확인

**이미지가 로드되지 않을 때**: `next.config.js`의 remotePatterns에 도메인이 있는지 확인
