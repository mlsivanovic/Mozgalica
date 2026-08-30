export function RoditeljskaIkona({ ime }: { ime: string }) {
  const crtezi: Record<string, React.ReactNode> = {
    danas: <><path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1Z" /></>,
    vezbanje: <><path d="M12 5v16M3 3h5a4 4 0 0 1 4 2 4 4 0 0 1 4-2h5v16h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3Z" /></>,
    napredak: <><path d="M4 3v17h17M8 15l4-5 4 2 5-7" /></>,
    nagrade: <><path d="M3 8h18v4H3zM5 12v9h14v-9M12 8v13" /><path d="M12 8C2 8 5 0 9 4l3 4c10 0 7-8 3-4Z" /></>,
    podesavanja: <><circle cx="12" cy="12" r="3" /><path d="m9 3 6 0 1 3 3 1 2 5-2 5-3 1-1 3H9l-1-3-3-1-2-5 2-5 3-1Z" /></>,
  }
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{crtezi[ime]}</svg>
}
