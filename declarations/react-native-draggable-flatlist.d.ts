declare module 'react-native-draggable-flatlist' {
  import { ComponentType } from 'react';

  export type RenderItemParams<T> = {
    item: T;
    index: number;
    drag: () => void;
    isActive: boolean;
  };

  type Props<T> = {
    data: T[];
    keyExtractor?: (item: T, index: number) => string;
    renderItem: (params: RenderItemParams<T>) => any;
    onDragEnd?: (params: { data: T[] }) => void;
    nestedScrollEnabled?: boolean;
    [key: string]: any;
  };

  const DraggableFlatList: ComponentType<Props<any>>;
  export default DraggableFlatList;
}
