import { IsBoolean, IsOptional } from 'class-validator';

export class StreamProtocolsDto {
  @IsOptional()
  @IsBoolean()
  whitelist?: boolean;

  @IsOptional()
  @IsBoolean()
  hls?: boolean;

  @IsOptional()
  @IsBoolean()
  player?: boolean;

  @IsOptional()
  @IsBoolean()
  rtmp?: boolean;

  @IsOptional()
  @IsBoolean()
  srt?: boolean;

  @IsOptional()
  @IsBoolean()
  cmaf?: boolean;

  @IsOptional()
  @IsBoolean()
  dash?: boolean;

  @IsOptional()
  @IsBoolean()
  mss?: boolean;

  @IsOptional()
  @IsBoolean()
  rtsp?: boolean;

  @IsOptional()
  @IsBoolean()
  m4f?: boolean;

  @IsOptional()
  @IsBoolean()
  m4s?: boolean;

  @IsOptional()
  @IsBoolean()
  mseld?: boolean;

  @IsOptional()
  @IsBoolean()
  tshttp?: boolean;

  @IsOptional()
  @IsBoolean()
  webrtc?: boolean;

  @IsOptional()
  @IsBoolean()
  shoutcast?: boolean;

  @IsOptional()
  @IsBoolean()
  mp4?: boolean;

  @IsOptional()
  @IsBoolean()
  jpeg?: boolean;

  @IsOptional()
  @IsBoolean()
  api?: boolean;
}
