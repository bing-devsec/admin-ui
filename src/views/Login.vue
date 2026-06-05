<template>
	<div id="app">
		<div class="content">
			<div class="content_input">
				<div class="title">
					<p>管理员登录</p>
				</div>
				<div class="container">
					<form>
						<el-tabs class="demo-tabs" v-model="activeTab">
							<el-tab-pane name="password-login">
								<template #label><span>账号登录</span></template>
								<!-- 默认显示用户名和密码输入框 -->
								<div v-if="!show2FA">
									<el-input v-model="username" clearable type="text" size="large"
										placeholder="账号"></el-input>
									<el-input v-model="password" clearable type="password" size="large"
										placeholder="密码"></el-input>
								</div>

								<div v-if="show2FA && qrCodeURL" class="twoFA">
									<p>请使用 Microsoft Authenticator 扫描二维码进行绑定</p>
									<el-image :src="qrCodeURL" class="qr-code" />
								</div>

								<div v-if="show2FA && !qrCodeURL" class="dynamic-code-input">
									<p>请输入6位动态验证码</p>
									<div class="code-boxes">
										<input v-for="(digit, index) in 6" :key="index" v-model="dynamicCode[index]"
											@input="onInput(index, $event)" @keydown="onKeyDown(index, $event)"
											maxlength="1" type="text" :ref="el => { if (el) codeInputs[index] = el }">
									</div>
								</div>
							</el-tab-pane>

							<el-tab-pane name="sms-login">
								<template #label><span>短信登录</span></template>
								<div v-if="activeTab === 'sms-login'">
									<el-input v-model="phone" clearable type="text" size="large"
										placeholder="手机号"></el-input>
									<div class="verification">
										<el-input style="width: 60%" v-model="smsCode" clearable type="password"
											size="large" placeholder="验证码">
										</el-input>
										<el-button @click="sendCode" :disabled="isButtonDisabled">
											{{ buttonText }}
										</el-button>
									</div>
								</div>
							</el-tab-pane>
						</el-tabs>
					</form>
				</div>
				<div class="button">
					<el-button plain type="primary" @click="handleButtonClick">{{ loginButtonText }}</el-button>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { ref, reactive, watch, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElNotification } from "element-plus";
import Ribbons from "../utils/ribbon";

// 定义响应式数据
const router = useRouter();
const username = ref("");
const password = ref("");
const phone = ref("");
const smsCode = ref("");
const countDown = ref(0);
const show2FA = ref(false);
const dynamicCode = ref(['', '', '', '', '', '']);
const codeInputs = reactive([]);
const qrCodeURL = ref('');
const isBinding2FA = ref(false);
const activeTab = ref("password-login");
const buttonText = computed(() => { return countDown.value > 0 ? `${countDown.value} 秒` : "发送验证码"; });
const loginButtonText = ref("登录");

let intervalId: ReturnType<typeof setInterval> | null = null;

const onInput = (index: number, event: Event) => {
	const input = event.target as HTMLInputElement;
	const value = input.value;

	// 确保输入的是单个数字
	if (!/^\d*$/.test(value)) {
		dynamicCode.value[index] = '';
		return;
	}

	// 自动跳到下一个输入框
	if (value && index < 5) {
		codeInputs[index + 1].focus();
	}
};

const onKeyDown = (index: number, event: KeyboardEvent) => {
	if (event.key === 'Backspace' && !dynamicCode.value[index] && index > 0) {
		codeInputs[index - 1].focus();
	}
};

// 返回登录方式函数
const handleButtonClick = () => {
	if (activeTab.value === 'password-login') {
		if (!show2FA.value) {
			passwordLogin();
		} else if (qrCodeURL.value) {
			show2FA.value = true;
			qrCodeURL.value = '';
			loginButtonText.value = "登录";
		} else {
			verifyDynamicCode();
		}
	} else {
		smsLogin();
	}
};

// 账号登录
const passwordLogin = async () => {
	if (!username.value || !password.value) {
		ElNotification({
			title: "Warning",
			message: "账号和密码不能为空",
			type: "warning",
		});
		return;
	}
	const reqData = { username: username.value, password: password.value };
	try {
		const response = await window.$axios.post("/admin/account-login", reqData);
		const { code, message, data } = response.data;
		if (code !== 2000 || message !== "") {
			ElNotification({
				title: "Failed",
				message: "登录失败",
				type: "error",
			});
		} else {
			if (data && data.qrCodeURL && data.userID) {
				localStorage.setItem("userID", data.userID);
				qrCodeURL.value = data.qrCodeURL;
				show2FA.value = true;
				loginButtonText.value = "已完成绑定";
				isBinding2FA.value = true;
			} else {
				localStorage.setItem("userID", data.userID);
				show2FA.value = true;
				loginButtonText.value = "登录";
				isBinding2FA.value = false;
			}
		}
	} catch (error) {
		console.error("account-login error:", error);
		ElNotification({
			title: "Error",
			message: "登录失败，请稍后重试",
			type: "error",
		});
	}
};

// 验证动态验证码
const verifyDynamicCode = async () => {
	const code = dynamicCode.value.join('');
	if (code.length !== 6) {
		ElNotification({
			title: "Warning",
			message: "请输入完整的6位动态验证码",
			type: "warning",
		});
		return;
	}
	const userID = localStorage.getItem("userID");
	const reqData = { code: code, userID: userID };
	try {
		const apiPath = isBinding2FA.value ? "/admin/bind-dynamic-code" : "/admin/verify-dynamic-code";
		const response = await window.$axios.post(apiPath, reqData);
		const { code, message, data } = response.data;
		if (code === 2000 && message === "") {
			handleLoginSuccess(data);
		} else {
			ElNotification({
				title: "Failed",
				message: "验证失败",
				type: "error",
			});
		}
	} catch (error) {
		console.error("verify-dynamic-code error:", error);
		ElNotification({
			title: "Error",
			message: "验证失败，请稍后重试",
			type: "error",
		});
	}
};

// 处理登录成功的函数
const handleLoginSuccess = (data: { userID: string }) => {
	const { userID } = data || {};
	// access_token / refresh_token 由后端以 HttpOnly Cookie 下发，前端不再持有
	localStorage.setItem("userID", userID);

	Ribbons.stop();
	router.push("/home/manage-article").catch(() => {});
};

// 短信登录
const smsLogin = async () => {
	if (!phone.value || !smsCode.value) {
		ElNotification({
			title: "Warning",
			message: "手机号和验证码不能为空",
			type: "warning",
		});
		return;
	}

	const reqData = { phone: phone.value, code: smsCode.value };
	try {
		const response = await window.$axios.post("/admin/sms-login", reqData);
		const { code, message, data } = response.data;
		if (code === 2000 && message === "") {
			handleLoginSuccess(data);
		} else {
			ElNotification({
				title: "Failed",
				message: "登录失败",
				type: "error",
			});
		}
	} catch (error) {
		console.error("sms-login error:", error);
		ElNotification({
			title: "Error",
			message: "登录失败，请稍后重试",
			type: "error",
		});
	}
};

// 发送验证码
const sendCode = async () => {
	if (isPhoneValid(phone.value)) {
		const data = { phone: phone.value };
		try {
			const response = await window.$axios.post("/admin/sms-code", data);
			const { code, message } = response.data;
			if (code === 2000 && message === "") {
				countDown.value = 60;
				intervalId = setInterval(() => {
					if (countDown.value > 0) {
						countDown.value--;
					} else {
						if (intervalId) clearInterval(intervalId);
					}
				}, 1000);

				ElNotification({
					title: "Success",
					message: "验证码发送成功",
					type: "success",
				});
			} else if (code === 4000) {
				ElNotification({
					title: "Failed",
					message: "无效的手机号",
					type: "error",
				});
			} else {
				ElNotification({
					title: "Failed",
					message: "登录失败",
					type: "error",
				});
			}
		} catch (error) {
			console.error("sms-code error:", error);
			ElNotification({
				title: "Error",
				message: "验证码发送失败，请稍后重试",
				type: "error",
			});
		}
	} else {
		ElNotification({
			title: "Error",
			message: "请输入有效的手机号码",
			type: "error",
		});
	}
};

// 验证手机号合法性
const isPhoneValid = (phone: string) => {
	const phoneRegex = /^[1]([3-9])[0-9]{9}$/;
	return phoneRegex.test(phone);
};

// 计算属性，判断发送验证码按钮是否禁用
const isButtonDisabled = computed(() => {
	return !isPhoneValid(phone.value) || countDown.value > 0;
});

// 开始动画
onMounted(() => {
	Ribbons.start();
});

// 监听 activeTab 的变化
watch(activeTab, () => {
	username.value = "";
	password.value = "";
	phone.value = "";
	smsCode.value = "";
	dynamicCode.value = ['', '', '', '', '', ''];
	show2FA.value = false;
	qrCodeURL.value = '';
	loginButtonText.value = "登录";

	if (intervalId) {
		clearInterval(intervalId);
		intervalId = null;
	}
	countDown.value = 0;
});
</script>

<style scoped>
.otp-container {
	margin-top: 20px;
}

.content {
	width: 530px;
	height: 400px;
	border-radius: 5px;
	box-shadow: 0px 2px 12px 0px rgba(105, 105, 105, 0.07);
	background: rgba(255, 255, 255, 0.5);
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	animation: mymove 1s ease-in-out alternate;
	overflow: hidden;
	transition: 1.5s;
}

.container {
	max-height: 100%;
	overflow-y: auto;
	margin-bottom: 20px;
}

@keyframes mymove {
	0% {
		width: 0px;
		height: 5px;
	}

	10% {
		width: 50px;
		height: 5px;
	}

	15% {
		width: 100px;
		height: 5px;
	}

	20% {
		width: 150px;
		height: 5px;
	}

	25% {
		width: 200px;
		height: 5px;
	}

	30% {
		width: 250px;
		height: 5px;
	}

	35% {
		width: 300px;
		height: 5px;
	}

	40% {
		width: 350px;
		height: 5px;
	}

	45% {
		width: 450px;
		height: 5px;
	}

	50% {
		width: 500px;
		height: 5px;
	}

	55% {
		height: 30px;
	}

	60% {
		height: 60px;
	}

	65% {
		height: 90px;
	}

	70% {
		height: 120px;
	}

	75% {
		height: 150px;
	}

	80% {
		height: 180px;
	}

	85% {
		height: 210px;
	}

	90% {
		height: 240px;
	}

	95% {
		height: 240px;
	}

	100% {
		height: 300px;
	}
}

.content_input {
	width: 420px;
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
}

:deep(.el-tabs__nav) {
	display: flex;
	justify-content: space-between;
	position: relative;
	transition: transform var(--el-transition-duration);
	white-space: nowrap;
	z-index: calc(var(--el-index-normal) + 1);
	float: none;
}

:deep(.el-tabs__item) {
	width: 50%;
	margin-right: -1px;
}

.el-input {
	margin: 16px 0px;
}

.title {
	text-align: center;
	font-size: 24px;
	margin-bottom: 10px;
	font-weight: bold;
	color: #606266;
}

.el-button--primary {
	width: 100%;
}

.verification {
	float: none;
	display: flex;
	justify-content: space-between;
	align-items: center;
}

.twoFA {
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	text-align: center;
}

.qr-code {
	max-width: 122px;
	max-height: 122px;
}

.button {
	margin-top: 35px;
}

.dynamic-code-input {
	text-align: center;
}

.code-boxes {
	display: flex;
	justify-content: center;
	gap: 10px;
	margin-top: 32px;
	margin-bottom: 32px;
}

.code-boxes input {
	width: 50px;
	height: 50px;
	font-size: 24px;
	text-align: center;
	border: 2px solid #dcdfe6;
	border-radius: 4px;
	outline: none;
}

.code-boxes input:focus {
	border-color: #409eff;
}
</style>
