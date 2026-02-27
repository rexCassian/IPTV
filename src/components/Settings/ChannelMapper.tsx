import React, { memo } from 'react';
import { Link2 } from 'lucide-react';

export const ChannelMapper = memo(function ChannelMapper() {
    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-sm font-semibold text-white mb-1">Kanal Eşleştirme</h3>
                <p className="text-xs text-dark-400">
                    M3U kanallarını EPG verileriyle eşleştirin
                </p>
            </div>

            <div className="p-6 text-center text-dark-500 border border-dashed border-dark-700 rounded-lg">
                <Link2 size={28} className="mx-auto mb-2 text-dark-600" />
                <p className="text-sm font-medium mb-1">Otomatik Eşleştirme</p>
                <p className="text-xs">
                    Kanallar, EPG verileri yüklendiğinde otomatik olarak eşleştirilir.
                    <br />
                    Eşleşme bulunamayan kanallar burada listelenecektir.
                </p>
            </div>
        </div>
    );
});
