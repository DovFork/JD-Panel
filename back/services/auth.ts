import { Service, Inject } from 'typedi';
import winston from 'winston';
import { createRandomString, getNetIp } from '../config/util';
import config from '../config';
import * as fs from 'fs';
import _ from 'lodash';
import jwt from 'jsonwebtoken';
import { authenticator } from '@otplib/preset-default';
import { exec } from 'child_process';
import DataStore from 'nedb';
import { AuthDataType, AuthInfo, LoginStatus } from '../data/auth';
import { NotificationInfo } from '../data/notify';
import NotificationService from './notify';

@Service()
export default class AuthService {
  @Inject((type) => NotificationService)
  private notificationService!: NotificationService;
  private authDb = new DataStore({ filename: config.authDbFile });

  constructor(@Inject('logger') private logger: winston.Logger) {
    this.authDb.loadDatabase((err) => {
      if (err) throw err;
    });
  }

  public async login(
    payloads: {
      username: string;
      password: string;
    },
    req: any,
    needTwoFactor = true,
  ): Promise<any> {
    if (!fs.existsSync(config.authConfigFile)) {
      return this.initAuthInfo();
    }

    let { username, password } = payloads;
    const content = this.getAuthInfo();
    const timestamp = Date.now();
    if (content) {
      const {
        username: cUsername,
        password: cPassword,
        retries = 0,
        lastlogon,
        lastip,
        lastaddr,
        twoFactorActivated,
      } = content;

      if (
        (cUsername === 'admin' && cPassword === 'admin') ||
        !cUsername ||
        !cPassword
      ) {
        return this.initAuthInfo();
      }

      if (retries > 2 && Date.now() - lastlogon < Math.pow(3, retries) * 1000) {
        return {
          code: 410,
          message: `失败次数过多，请${Math.round(
            (Math.pow(3, retries) * 1000 - Date.now() + lastlogon) / 1000,
          )}秒后重试`,
          data: Math.round(
            (Math.pow(3, retries) * 1000 - Date.now() + lastlogon) / 1000,
          ),
        };
      }

      const { ip, address } = await getNetIp(req);
      if (username === cUsername && password === cPassword) {
        if (twoFactorActivated && needTwoFactor) {
          this.updateAuthInfo(content, {
            isTwoFactorChecking: true,
          });
          return {
            code: 420,
            message: '请输入两步验证token',
          };
        }

        const data = createRandomString(50, 100);
        const expiration = twoFactorActivated ? 30 : 3;
        let token = jwt.sign({ data }, config.secret as any, {
          expiresIn: 60 * 60 * 24 * expiration,
          algorithm: 'HS384',
        });

        this.updateAuthInfo(content, {
          token,
          lastlogon: timestamp,
          retries: 0,
          lastip: ip,
          lastaddr: address,
          isTwoFactorChecking: false,
        });
        await this.notificationService.notify(
          '登陆通知',
          `你于${new Date(
            timestamp,
          ).toLocaleString()}在 ${address} 登陆成功，ip地址 ${ip}"`,
        );
        await this.getLoginLog();
        await this.insertDb({
          type: AuthDataType.loginLog,
          info: { timestamp, address, ip, status: LoginStatus.success },
        });
        return {
          code: 200,
          data: { token, lastip, lastaddr, lastlogon, retries },
        };
      } else {
        this.updateAuthInfo(content, {
          retries: retries + 1,
          lastlogon: timestamp,
          lastip: ip,
          lastaddr: address,
        });
        await this.notificationService.notify(
          '登陆通知',
          `你于${new Date(
            timestamp,
          ).toLocaleString()}在 ${address} 登陆失败，ip地址 ${ip}"`,
        );
        await this.getLoginLog();
        await this.insertDb({
          type: AuthDataType.loginLog,
          info: { timestamp, address, ip, status: LoginStatus.fail },
        });
        return { code: 400, message: config.authError };
      }
    } else {
      return this.initAuthInfo();
    }
  }

  public async getLoginLog(): Promise<AuthInfo[]> {
    return new Promise((resolve) => {
      this.authDb.find({ type: AuthDataType.loginLog }).exec((err, docs) => {
        if (err || docs.length === 0) {
          resolve([]);
        } else {
          const result = docs.sort(
            (a, b) => b.info.timestamp - a.info.timestamp,
          );
          if (result.length > 100) {
            this.authDb.remove({ _id: result[result.length - 1]._id });
          }
          resolve(result.map((x) => x.info));
        }
      });
    });
  }

  private async insertDb(payload: AuthInfo): Promise<AuthInfo> {
    return new Promise((resolve) => {
      this.authDb.insert(payload, (err, doc) => {
        if (err) {
          this.logger.error(err);
        } else {
          resolve(doc);
        }
      });
    });
  }

  private initAuthInfo() {
    const newPassword = createRandomString(16, 22);
    fs.writeFileSync(
      config.authConfigFile,
      JSON.stringify({
        username: 'admin',
        password: newPassword,
      }),
    );
    return {
      code: 100,
      message: '已初始化密码，请前往auth.json查看并重新登录',
    };
  }

  public getUserInfo(): Promise<any> {
    return new Promise((resolve) => {
      fs.readFile(config.authConfigFile, 'utf8', (err, data) => {
        if (err) console.log(err);
        resolve(JSON.parse(data));
      });
    });
  }

  public initTwoFactor() {
    const secret = authenticator.generateSecret();
    const authInfo = this.getAuthInfo();
    const otpauth = authenticator.keyuri(authInfo.username, 'qinglong', secret);
    this.updateAuthInfo(authInfo, { twoFactorSecret: secret });
    return { secret, url: otpauth };
  }

  public activeTwoFactor(code: string) {
    const authInfo = this.getAuthInfo();
    const isValid = authenticator.verify({
      token: code,
      secret: authInfo.twoFactorSecret,
    });
    if (isValid) {
      this.updateAuthInfo(authInfo, { twoFactorActivated: true });
    }
    return isValid;
  }

  public async twoFactorLogin({ username, password, code }, req) {
    const authInfo = this.getAuthInfo();
    const { isTwoFactorChecking, twoFactorSecret } = authInfo;
    if (!isTwoFactorChecking) {
      return { code: 450, message: '未知错误' };
    }
    const isValid = authenticator.verify({
      token: code,
      secret: twoFactorSecret,
    });
    if (isValid) {
      return this.login({ username, password }, req, false);
    } else {
      const { ip, address } = await getNetIp(req);
      this.updateAuthInfo(authInfo, {
        lastip: ip,
        lastaddr: address,
      });
      return { code: 430, message: '验证失败' };
    }
  }

  public deactiveTwoFactor() {
    const authInfo = this.getAuthInfo();
    this.updateAuthInfo(authInfo, {
      twoFactorActivated: false,
      twoFactorSecret: '',
    });
    return true;
  }

  private getAuthInfo() {
    const content = fs.readFileSync(config.authConfigFile, 'utf8');
    return JSON.parse(content || '{}');
  }

  private updateAuthInfo(authInfo: any, info: any) {
    fs.writeFileSync(
      config.authConfigFile,
      JSON.stringify({ ...authInfo, ...info }),
    );
  }

  public async getNotificationMode(): Promise<NotificationInfo> {
    return new Promise((resolve) => {
      this.authDb
        .find({ type: AuthDataType.notification })
        .exec((err, docs) => {
          if (err || docs.length === 0) {
            resolve({} as NotificationInfo);
          } else {
            resolve(docs[0].info);
          }
        });
    });
  }

  private async updateNotificationDb(payload: AuthInfo): Promise<any> {
    return new Promise((resolve) => {
      this.authDb.update(
        { type: AuthDataType.notification },
        { ...payload },
        { upsert: true, returnUpdatedDocs: true },
        (err, num, doc: any) => {
          if (err) {
            resolve({} as NotificationInfo);
          } else {
            resolve(doc.info);
          }
        },
      );
    });
  }

  public async updateNotificationMode(notificationInfo: NotificationInfo) {
    const code = Math.random().toString().slice(-6);
    const isSuccess = await this.notificationService.testNotify(
      notificationInfo,
      '青龙',
      `【蛟龙】您本次的验证码：${code}`,
    );
    if (isSuccess) {
      const result = await this.updateNotificationDb({
        type: AuthDataType.notification,
        info: { ...notificationInfo },
      });
      return { code: 200, data: { ...result, code } };
    } else {
      return { code: 400, data: '通知发送失败，请检查参数' };
    }
  }
}
