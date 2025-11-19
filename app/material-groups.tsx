import React, {useRef, useEffect, useMemo} from 'react';
import { View, Text, StyleSheet, Alert, TouchableOpacity, ScrollView, Animated, Dimensions } from 'react-native';
import { useMaterialGroups } from '@/hooks/use-material-groups';
import { useTranslation } from './_i18n';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ScreenTemplate } from '@/components/ScreenTemplate';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';

const PALETTE = [
  ['#ffdde1','#ee9ca7'],
  ['#cfd9df','#e2ebf0'],
  ['#fbc2eb','#a6c1ee'],
  ['#fadead','#f5c1c0'],
  ['#d4fc79','#96e6a1'],
  ['#84fab0','#8fd3f4'],
  ['#e0c3fc','#8ec5fc'],
  ['#fccb90','#d57eeb'],
  ['#fa8bff','#2bd2ff'],
] as const; // readonly for gradient typing

export default function MaterialGroupsScreen() {
  const { t } = useTranslation();
  const { materialGroups, isLoading, error, remove } = useMaterialGroups();
  const router = useRouter();
  const params = useLocalSearchParams();
  const headerColor1 = (params.headerColor1 as string) || '#43e97b';
  const headerColor2 = (params.headerColor2 as string) || '#38f9d7';

  // Shimmer skeleton
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  useEffect(()=>{ if(isLoading){ const loop = Animated.loop(Animated.sequence([
    Animated.timing(shimmerAnim,{toValue:1,duration:1100,useNativeDriver:true}),
    Animated.timing(shimmerAnim,{toValue:0,duration:1100,useNativeDriver:true}),
  ])); loop.start(); return ()=> loop.stop(); } },[isLoading, shimmerAnim]);

  const screenWidth = Dimensions.get('window').width;
  const contentWidth = screenWidth - 32;

  // Remove unused shuffledGroups (list order preserved)

  // Build list gradients per index (directly use PALETTE in map)

  const confirmDelete = (id: string, name?: string) => {
    Alert.alert(
      t('delete') || 'Delete',
      (t('deleteConfirm') || 'Are you sure you want to delete this item?') + (name ? `\n${name}` : ''),
      [
        { text: t('cancel') || 'Cancel', style: 'cancel' },
        { text: t('delete') || 'Delete', style: 'destructive', onPress: async () => { await remove(id); } },
      ]
    );
  };

  const hashCode = (str: string) => { let h=0; for(let i=0;i<str.length;i++){ h=(Math.imul(31,h)+str.charCodeAt(i))|0;} return Math.abs(h); };

  const shuffled = useMemo(()=>{
    if(!materialGroups) return [] as any[];
    const arr=[...materialGroups];
    for(let i=arr.length-1;i>0;i--){ const seed = hashCode(String(arr[i]._id||i)); const j = seed % (i+1); [arr[i],arr[j]]=[arr[j],arr[i]]; }
    return arr;
  },[materialGroups]);

  const scatter = useMemo(()=>{
    if(!shuffled.length) return {items:[], height:0};
    const cols = contentWidth > 900 ? 4 : contentWidth > 680 ? 3 : 2;
    const gutter = 16;
    const colWidth = (contentWidth - (cols-1)*gutter)/cols;
    const heights = Array(cols).fill(0);
    const items: any[] = [];
    shuffled.forEach((g, idx)=>{
      const seed = hashCode(String(g._id||idx));
      let col=0; let minH=heights[0];
      for(let c=1;c<cols;c++){ if(heights[c] < minH){ minH=heights[c]; col=c; } }
      const hRand = (seed % 1000)/1000;
      const height = 120 + Math.round(hRand*180);
      let span=1; if(cols>2 && (seed % 9===0) && col<cols-1) span=2;
      const width = span*colWidth + (span-1)*gutter;
      const x = col*(colWidth+gutter);
      const y = heights[col];
      heights[col] += height + gutter; if(span===2) heights[col+1]=heights[col];
      const grad = PALETTE[seed % PALETTE.length] as readonly [string,string];
      const rotateDeg = ((seed % 15)-7)*0.4;
      const radius = 30 + (seed % 12);
      items.push({key:g._id, g, style:{position:'absolute', left:x, top:y, width, height, transform:[{rotate: rotateDeg+'deg'}]}, visual:{grad, radius}});
    });
    return {items, height: Math.max(...heights)};
  },[shuffled, contentWidth]);

  return (
    <ScreenTemplate
      title={t('materialGroups') || 'Material Groups'}
      showBackButton={true}
      showAddButton={true}
      onAddPress={() => router.push('/material-groups/new')}
      headerGradient={[headerColor1, headerColor2, '#38f9d7'] as any}
      fabColor={headerColor1}
    >
      <View style={styles.outerContainer}>
        {isLoading ? (
          <View style={styles.skeletonList}>
            {Array.from({length:6}).map((_,i)=>{
              const opacity = shimmerAnim.interpolate({inputRange:[0,1], outputRange:[0.35,1]});
              return (
                <Animated.View key={i} style={[styles.skeletonItem,{opacity}]}>
                  <View style={styles.skelIcon} />
                  <View style={styles.skelLine} />
                </Animated.View>
              );
            })}
          </View>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : !materialGroups || materialGroups.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.empty}>{t('noMaterialGroups') || 'No material groups yet'}</Text>
            <TouchableOpacity style={styles.bubbleBtn} onPress={()=>router.push('/materials')} activeOpacity={0.9}>
              <LinearGradient colors={['#43e97b','#38f9d7','#2bd2ff']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.bubbleBtnGradient}>
                <View style={styles.bubbleBtnInner}>
                  <MaterialIcons name="inventory" size={20} color="#fff" style={{marginRight:8}} />
                  <Text style={styles.bubbleBtnText}>{t('materialsList') || 'Materials list'}</Text>
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{paddingBottom:120}}>
            <View style={styles.listHeader}>
              <TouchableOpacity style={styles.bubbleBtn} onPress={() => router.push('/materials')} activeOpacity={0.9}>
                <LinearGradient colors={['#43e97b','#38f9d7','#2bd2ff']} start={{x:0,y:0}} end={{x:1,y:1}} style={styles.bubbleBtnGradient}>
                  <View style={styles.bubbleBtnInner}>
                    <MaterialIcons name="inventory" size={20} color="#fff" style={{marginRight:8}} />
                    <Text style={styles.bubbleBtnText}>{t('materialsList') || 'Materials list'}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            </View>
            <View style={[styles.scatterContainer,{height: scatter.height}]}>
              {scatter.items.map(({key, g, style, visual})=> (
                <TouchableOpacity
                  key={key}
                  activeOpacity={0.88}
                  onPress={()=>router.push(`./material-groups/${g._id}`)}
                  onLongPress={()=>confirmDelete(g._id, g.name)}
                  style={style}
                >
                  <LinearGradient colors={visual.grad} start={{x:0,y:0}} end={{x:1,y:1}} style={[styles.scatterGradient,{borderRadius: visual.radius}]}>
                    <View style={[styles.scatterInner,{borderRadius: visual.radius-6}]}>
                      <Text style={styles.scatterTitle} numberOfLines={2}>{g.name}</Text>
                      {g.description ? <Text style={styles.scatterDesc} numberOfLines={2}>{g.description}</Text> : null}
                      <View style={styles.scatterFooterRow}>
                        <Text style={styles.scatterMeta}>{t('open') || 'Open'}</Text>
                        <TouchableOpacity onPress={()=>confirmDelete(g._id, g.name)} style={styles.scatterDeleteBtn}>
                          <MaterialIcons name="delete" size={16} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        )}
      </View>
    </ScreenTemplate>
  );
}

const styles = StyleSheet.create({
  outerContainer:{ flex:1, paddingHorizontal:16, paddingTop:16 },
  errorText: { color: 'red', textAlign: 'center', marginTop: 20 },
  empty:{ textAlign:'center', color:'#555', fontSize:16, fontWeight:'500' },
  emptyWrap:{ alignItems:'center', marginTop:40 },
  bubbleBtn:{ marginTop:16, borderRadius:32, shadowColor:'#38f9d7', shadowOpacity:0.25, shadowRadius:10, shadowOffset:{width:0,height:4}, elevation:6 },
  bubbleBtnGradient:{ borderRadius:32, padding:2 },
  bubbleBtnInner:{ flexDirection:'row', alignItems:'center', justifyContent:'center', backgroundColor:'rgba(255,255,255,0.20)', paddingVertical:12, paddingHorizontal:24, borderRadius:30 },
  bubbleBtnText:{ color:'#fff', fontWeight:'700', fontSize:15, letterSpacing:0.3 },
  listHeader:{ width:'100%', marginBottom:12 },
  scatterContainer:{ position:'relative' },
  scatterGradient:{ flex:1, padding:6 },
  scatterInner:{ flex:1, backgroundColor:'rgba(255,255,255,0.18)', padding:14 },
  scatterTitle:{ fontSize:16, fontWeight:'700', color:'#fff', marginBottom:6 },
  scatterDesc:{ fontSize:12, fontWeight:'500', color:'rgba(255,255,255,0.9)', marginBottom:4 },
  scatterFooterRow:{ position:'absolute', left:14, right:14, bottom:10, flexDirection:'row', alignItems:'center', justifyContent:'space-between' },
  scatterMeta:{ fontSize:11, fontWeight:'600', color:'rgba(255,255,255,0.95)' },
  scatterDeleteBtn:{ backgroundColor:'rgba(0,0,0,0.30)', paddingHorizontal:10, paddingVertical:6, borderRadius:18 },
  // Skeleton
  skeletonList:{ marginTop:12 },
  skeletonItem:{ flexDirection:'row', alignItems:'center', padding:14, backgroundColor:'#ffffff33', borderRadius:24, marginBottom:12 },
  skelIcon:{ width:36, height:36, borderRadius:18, backgroundColor:'#ffffff44', marginRight:12 },
  skelLine:{ height:12, backgroundColor:'#ffffff40', borderRadius:6, flex:1 },
});
