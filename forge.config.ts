import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';

const config: ForgeConfig = {
    packagerConfig: {
        name: 'Coriolis IPTV',
        executableName: 'coriolis-iptv',
        icon: './public/icon',
        asar: true,
        extraResource: ['./resources'],
    },
    makers: [
        new MakerSquirrel({
            name: 'CoriolisIPTV',
            authors: 'Coriolis',
            description: 'Coriolis IPTV Application',
            setupIcon: './public/icon.ico',
        }),
        new MakerZIP({}, ['win32']),
    ],
};

export default config;
