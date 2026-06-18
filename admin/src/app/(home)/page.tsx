import type { Metadata } from 'next';

import { HomeView } from 'src/sections/home/view';

// ----------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Lunch Drop — korporativ ovqatlanish platformasi',
  description:
    'Lunch Drop kompaniyalar, oshxonalar va xodimlarni yagona platformada bog‘lab, korporativ ovqat buyurtmasi va yetkazib berish jarayonini boshqaradi.',
};

export default function Page() {
  return <HomeView />;
}
