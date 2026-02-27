import React, { memo } from 'react';
import { CategoryList } from './CategoryList';
import { ChannelList } from './ChannelList';
import { useChannelStore } from '../../store/channelStore';

export const LiveView = memo(function LiveView() {
    const { filter } = useChannelStore();

    // Show category browser when no group/search/favorites filter active
    const showCategories = !filter.group && !filter.search && !filter.favorites;

    return showCategories ? <CategoryList /> : <ChannelList />;
});
