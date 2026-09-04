/* 어디서 실행되는지에 따라 저장소 구현을 바꿔 끼운다.
   Vercel은 모든 배포에 process.env.VERCEL 을 자동으로 심어주므로,
   그게 있으면 Vercel Blob을, 없으면(=사내 PC/서버에서 node로 직접
   실행) 로컬 디스크 저장소를 쓴다. 라우트 코드는 이 파일만 보고
   어느 쪽인지 신경 쓸 필요가 없다. */
module.exports = process.env.VERCEL ? require("./blob-vercel") : require("./blob-local");
