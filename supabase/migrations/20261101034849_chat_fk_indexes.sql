-- 성능 점검(0001): 외래 키 색인. 사용자 삭제 시 메시지·읽음 위치를 찾을 때 씁니다.
create index messages_sender_id_idx on public.messages (sender_id);
create index room_reads_user_id_idx on public.room_reads (user_id);
