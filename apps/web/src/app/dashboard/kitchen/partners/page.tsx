import { CONFIG } from 'src/global-config';

import { KitchenPartnersView } from 'src/sections/kitchen/view/kitchen-partners-view';

export const metadata = { title: `Hamkorlar va so‘rovlar | ${CONFIG.appName}` };

export default function Page() {
  return <KitchenPartnersView />;
}
