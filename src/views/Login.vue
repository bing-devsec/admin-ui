<template>
	<div id="app">
		<div class="content">
			<div class="content_input">
				<div class="title">
					<p>管理员登录</p>
				</div>
				<div class="container">
					<el-tabs class="demo-tabs" v-model="activeTab">
						<el-tab-pane name="password-login">
							<template #label><span>账号登录</span></template>
							<div v-if="activeTab === 'password-login'">
								<el-input v-model="username" clearable type="text" size="large"
									placeholder="账号"></el-input>
								<el-input v-model="password" clearable type="password" size="large"
									placeholder="密码"></el-input>
							</div>
						</el-tab-pane>

						<el-tab-pane name="sms-login">
							<template #label><span>短信登录</span></template>
							<div v-if="activeTab === 'sms-login'">
								<el-input v-model="phone" clearable type="text" size="large"
									placeholder="手机号"></el-input>
								<div class="verification">
									<el-input style="width: 60%" v-model="smsCode" clearable type="password"
										size="large" placeholder="验证码"></el-input>
									<el-button @click="sendCode" :disabled="isButtonDisabled">{{ buttonText
										}}</el-button>
								</div>
							</div>
						</el-tab-pane>
					</el-tabs>
				</div>
				<div class="content-button">
					<el-button plain type="primary" @click="SignIn">登录</el-button>
				</div>
			</div>
		</div>
	</div>
</template>

<script lang="ts" setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { ElNotification } from "element-plus";
import { AxiosResponse } from 'axios';
import Ribbons from "../utils/ribbon.js";

// 定义响应式数据
const router = useRouter();
const username = ref("");
const password = ref("");
const phone = ref("");
const smsCode = ref("");
const countDown = ref(0); // 验证码倒计时
const activeTab = ref("password-login"); // 默认登录方式
const isPasswordLogin = ref(true); // 当前选中的登录方式，默认为账号登录
const buttonText = computed(() => { return countDown.value > 0 ? `${countDown.value} 秒` : "发送验证码"; });

let intervalId: NodeJS.Timeout | null = null;

// 账号登录
const passwordLogin = async () => {
	if (!username.value || !password.value) {
		ElNotification({
			title: "错误",
			message: "账号和密码不能为空",
			type: "error",
		});
		return;
	}
	const data = { username: username.value, password: password.value };
	const accessToken = localStorage.getItem("accessToken");
	console.log("accessToken: ", accessToken);

	const refreshToken = localStorage.getItem("refreshToken");
	console.log("refreshToken: ", refreshToken);


	try {
		const response = await window.$axios.post("/admin/account-login", data, {
			headers: { Authorization: `Bearer ${accessToken}` },
		});

		const code = response.data.code;
		if (code !== 2000) {
			ElNotification({
				title: "错误",
				message: "无效的账号或密码",
				type: "error",
			});
		} else {
			const userID = response.data.data;
			console.log(userID);
			localStorage.setItem("userID", userID);
			Ribbons.stop();
			router.push("/home/article/list");
		}
	} catch (error) {
		console.log(error);
		handleLoginError(error);
	}
};

interface RefreshTokenResponse {
	data: {
		accessToken: string;
		refreshToken: string;
		userID: string;
	};
}


// 账号登录的错误处理函数
const handleLoginError = (error: any) => {
	if (error.response) {
		const { status, data } = error.response;
		if (status === 200 && data) {
			const { code, message } = data;
			if (code === 4010 || code === 4011) {
				router.push("/login");
			} else if (code === 4012) {
				const refreshToken = localStorage.getItem("refreshToken");
				if (refreshToken) {
					window.$axios
					.post("/admin/refresh-token", null, {
						headers: { Authorization: `Bearer ${refreshToken}` },
					})
					.then((response: AxiosResponse<RefreshTokenResponse>) => {
						const { accessToken, refreshToken, userID } = response.data.data || {};
						localStorage.setItem("accessToken", accessToken);
						localStorage.setItem("refreshToken", refreshToken);
						localStorage.setItem("userID", userID);
						window.$axios.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
						router.push("/home/article/list");
					})
					.catch(() => {
						router.push("/login");
					});
				} else {
					router.push("/login");
				}
			} else if (code === 5000) {
				ElNotification({
					title: "错误",
					message: message,
					type: "error",
				});
			} else if (code === 4000) {
				ElNotification({
					title: "错误",
					message: message,
					type: "error",
				});
			} else {
				ElNotification({
					title: "错误",
					message: message,
					type: "error",
				});
			}
		} else {
			ElNotification({
				title: "错误",
				message: error,
				type: "error",
			});
		}
	} else {
		ElNotification({
			title: "错误",
			message: error,
			type: "error",
		});
		console.error("erros: ", error);
	}
};


const smsLogin = async () => {
	// 校验手机号和验证码不能为空
	if (!phone.value || !smsCode.value) {
		ElNotification({
			title: "错误",
			message: "手机号和验证码不能为空",
			type: "error",
		});
		return;
	}

	const reqData = { phone: phone.value, code: smsCode.value };

	try {
		const response = await window.$axios.post("/admin/sms-login", reqData);
		const { code, message, data } = response.data;
		const { accessToken, refreshToken, userID } = data || {};

		if (code === 2000) {
			// 登录成功
			localStorage.setItem("accessToken", accessToken);
			localStorage.setItem("refreshToken", refreshToken);
			localStorage.setItem("userID", userID);

			Ribbons.stop();
			router.push("/home/article/list");

			ElNotification({
				title: "成功",
				message: "登录成功",
				type: "success",
			});
		} else if (code === 4000) {
			ElNotification({
				title: "错误",
				message: "手机号或验证码错误",
				type: "error",
			});
		} else if (code === 5000) {
			ElNotification({
				title: "错误",
				message: "登录失败，请稍后再试",
				type: "error",
			});
		} else {
			ElNotification({
				title: "错误",
				message: message,
				type: "error",
			});
		}
	} catch (error) {
		ElNotification({
			title: "错误",
			message: error,
			type: "error",
		});
		console.error(error);
	}
};

// 发送验证码
const sendCode = async () => {
	if (isPhoneValid(phone.value)) {
		const data = { phone: phone.value };

		try {
			const response = await window.$axios.post("/admin/sms-code", data);
			const { code, message } = response.data;

			if (code === 2000) {
				countDown.value = 60;
				intervalId = setInterval(() => {
					if (countDown.value > 0) {
						countDown.value--;
					} else {
						if (intervalId) clearInterval(intervalId);
					}
				}, 1000);

				ElNotification({
					title: "成功",
					message: "验证码发送成功",
					type: "success",
				});
			} else if (code === 4000) {
				ElNotification({
					title: "错误",
					message: "无效的手机号",
					type: "error",
				});
			} else if (code === 5000) {
				ElNotification({
					title: "错误",
					message: "验证码发送失败，请稍后再试",
					type: "error",
				});
			} else {
				ElNotification({
					title: "错误",
					message: message,
					type: "error",
				});
			}
		} catch (error) {
			ElNotification({
				title: "错误",
				message: error,
				type: "error",
			});
			console.error(error);
		}
	} else {
		ElNotification({
			title: "错误",
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

// 切换登录方式
const toggleLoginMethod = () => {
	isPasswordLogin.value = !isPasswordLogin.value;
	if (activeTab.value === 'sms-login') {
		isPasswordLogin.value = false;
	}
};


// 开始动画
onMounted(() => {
	Ribbons.start();
});

// 返回登录方式函数
const SignIn = computed(() => {
	return activeTab.value === 'password-login' ? passwordLogin : smsLogin;
});
</script>



<style scoped>
.content {
	width: 520px;
	height: 350px;
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
	width: 340px;
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
	margin: 14px 0px;
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
</style>
