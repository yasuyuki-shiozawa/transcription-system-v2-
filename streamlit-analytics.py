"""
議事録分析ダッシュボード（Streamlit版）
メインシステムとは別に、分析専用ツールとして使用
"""

import streamlit as st
import pandas as pd
import plotly.express as px
from datetime import datetime
import psycopg2

st.set_page_config(
    page_title="議事録分析ダッシュボード",
    page_icon="📊",
    layout="wide"
)

st.title("議会議事録 分析ダッシュボード")

# データベース接続
@st.cache_resource
def get_connection():
    return psycopg2.connect(
        host=st.secrets["db_host"],
        database=st.secrets["db_name"],
        user=st.secrets["db_user"],
        password=st.secrets["db_password"]
    )

# データ取得
@st.cache_data(ttl=600)
def load_data():
    conn = get_connection()
    query = """
    SELECT 
        s.speaker,
        s.timestamp,
        s.content,
        LENGTH(s.content) as content_length,
        td.session_id,
        sess.date as session_date
    FROM sections s
    JOIN transcription_data td ON s.transcription_data_id = td.id
    JOIN sessions sess ON td.session_id = sess.id
    WHERE s.speaker_id IS NOT NULL
    """
    return pd.read_sql(query, conn)

# サイドバー
with st.sidebar:
    st.header("フィルター")
    
    # 期間選択
    date_range = st.date_input(
        "期間",
        value=(datetime(2024, 1, 1), datetime.now()),
        format="YYYY/MM/DD"
    )
    
    # 話者選択
    df = load_data()
    speakers = st.multiselect(
        "話者",
        options=df['speaker'].unique(),
        default=df['speaker'].unique()[:5]
    )

# メインコンテンツ
tab1, tab2, tab3 = st.tabs(["📊 統計", "📈 時系列", "🔍 詳細"])

with tab1:
    col1, col2, col3 = st.columns(3)
    
    with col1:
        st.metric("総発言数", f"{len(df):,}")
    
    with col2:
        st.metric("総話者数", f"{df['speaker'].nunique():,}")
    
    with col3:
        avg_length = df['content_length'].mean()
        st.metric("平均発言文字数", f"{avg_length:.0f}")
    
    # 話者別発言回数
    st.subheader("話者別発言回数")
    speaker_counts = df['speaker'].value_counts().head(20)
    fig1 = px.bar(
        x=speaker_counts.values,
        y=speaker_counts.index,
        orientation='h',
        labels={'x': '発言回数', 'y': '話者'}
    )
    st.plotly_chart(fig1, use_container_width=True)

with tab2:
    st.subheader("月別発言数推移")
    
    # 月別集計
    df['month'] = pd.to_datetime(df['session_date']).dt.to_period('M')
    monthly_counts = df.groupby(['month', 'speaker']).size().reset_index(name='count')
    
    fig2 = px.line(
        monthly_counts[monthly_counts['speaker'].isin(speakers)],
        x='month',
        y='count',
        color='speaker',
        labels={'count': '発言数', 'month': '年月'}
    )
    st.plotly_chart(fig2, use_container_width=True)

with tab3:
    st.subheader("発言内容検索")
    
    search_term = st.text_input("検索キーワード")
    
    if search_term:
        filtered_df = df[df['content'].str.contains(search_term, na=False)]
        st.write(f"検索結果: {len(filtered_df)}件")
        
        for _, row in filtered_df.head(10).iterrows():
            with st.expander(f"{row['speaker']} - {row['timestamp']}"):
                st.write(row['content'])

# エクスポート機能
st.sidebar.divider()
if st.sidebar.button("CSVエクスポート"):
    csv = df.to_csv(index=False).encode('utf-8-sig')
    st.sidebar.download_button(
        label="ダウンロード",
        data=csv,
        file_name=f"議事録分析_{datetime.now().strftime('%Y%m%d')}.csv",
        mime="text/csv"
    )