import * as confetti from "canvas-confetti";
import { createClient } from "@supabase/supabase-js";
import * as bcrypt from "bcryptjs";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error("Supabase URL and Key are required");
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface Student {
  id: string;
  name: string;
  avatar: string;
  points: number;
  class_id?: string;
}

interface Class {
  id: string;
  class_name: string;
  teacher_name: string;
  teacher_emoji: string;
  password_hash: string;
  created_at: string;
  updated_at: string;
}

interface SessionData {
  class_id: string;
  class_name: string;
  teacher_name: string;
  teacher_emoji: string;
}

class ClassroomManagement {
  private students: Student[] = [];
  private studentGrid: HTMLElement;
  private isStudentView: boolean;
  private addStudentBtn: HTMLElement;
  private addStudentModal: HTMLElement;
  private submitStudentBtn: HTMLElement;
  private closeModalBtn: HTMLElement;
  private resetPointsBtn: HTMLElement;
  private loginOverlay: HTMLElement;
  private passwordInput: HTMLInputElement;
  private loginButton: HTMLElement;
  private mainContent: HTMLElement;
  private logoutBtn: HTMLElement;
  private pointSound: HTMLAudioElement;
  private confirmResetModal: HTMLElement;
  private confirmResetBtn: HTMLElement;
  private cancelResetBtn: HTMLElement;
  private giveAllPointsBtn: HTMLElement;
  private audioContext: AudioContext | null = null;
  private audioBuffer: AudioBuffer | null = null;
  private trexModeBtn: HTMLElement;
  private isTrexModeActive: boolean = false;
  private trexAudio: HTMLAudioElement | null = null;
  private trexVideo: HTMLVideoElement | null = null;

  // Bulk management controls
  private toggleSelectionModeBtn: HTMLButtonElement;
  private bulkControls: HTMLElement;
  private selectAllBtn: HTMLButtonElement;
  private selectNoneBtn: HTMLButtonElement;
  private selectionCount: HTMLElement;
  private bulkAddPointBtn: HTMLButtonElement;
  private bulkRemovePointBtn: HTMLButtonElement;
  private isSelectionModeActive: boolean = false;

  private currentSession: SessionData | null = null;

  constructor() {
    this.isStudentView = document.body.classList.contains("student-view");

    // Check for valid session first
    this.currentSession = this.getSession();
    if (!this.currentSession) {
      // No valid session, redirect to homepage
      window.location.href = 'index.html';
      return;
    }

    if (
      document
        .querySelector("body")
        .contains(document.getElementById("studentGrid"))
    ) {
      if (this.isStudentView) {
        this.initializeStudentPage();
      } else {
        this.initializeTeacherPage();
      }
    }
    this.initAudio();
    this.initializeTrexAudio();
    this.addEventListeners();
    this.updateClassContext();
  }

  private initializeStudentPage() {
    this.studentGrid = document.getElementById("studentGrid")!;
    this.loadStudents();
  }

  private initializeTeacherPage() {
    this.studentGrid = document.getElementById("studentGrid")!;
    this.addStudentBtn = document.getElementById("addStudentBtn")!;
    this.addStudentModal = document.getElementById("addStudentModal")!;
    this.submitStudentBtn = document.getElementById("submitStudent")!;
    this.closeModalBtn = document.getElementById("closeModal")!;
    this.resetPointsBtn = document.getElementById("resetPointsBtn")!;
    this.logoutBtn = document.getElementById("logoutBtn")!;
    this.giveAllPointsBtn = document.getElementById("giveAllPointsBtn")!;
    this.trexModeBtn = document.getElementById("trexModeBtn")!;
    this.trexVideo = document.getElementById("trexVideo") as HTMLVideoElement;

    // Initialize bulk management controls
    this.toggleSelectionModeBtn = document.getElementById("toggleSelectionModeBtn") as HTMLButtonElement;
    this.bulkControls = document.getElementById("bulkControls")!;
    this.selectAllBtn = document.getElementById("selectAllBtn") as HTMLButtonElement;
    this.selectNoneBtn = document.getElementById("selectNoneBtn") as HTMLButtonElement;
    this.selectionCount = document.getElementById("selectionCount")!;
    this.bulkAddPointBtn = document.getElementById("bulkAddPointBtn") as HTMLButtonElement;
    this.bulkRemovePointBtn = document.getElementById("bulkRemovePointBtn") as HTMLButtonElement;

    const pointSoundElement = document.getElementById("pointSound");
    if (pointSoundElement instanceof HTMLAudioElement) {
      this.pointSound = pointSoundElement;
      this.pointSound.load(); // Preload the audio
    } else {
      console.error("Point sound element not found or is not an audio element");
    }

    this.loginOverlay = document.getElementById("loginOverlay")!;
    this.passwordInput = document.getElementById(
      "passwordInput"
    ) as HTMLInputElement;
    this.loginButton = document.getElementById("loginButton")!;
    this.mainContent = document.getElementById("mainContent")!;

    this.confirmResetModal = document.getElementById("confirmResetModal")!;
    this.confirmResetBtn = document.getElementById("confirmResetBtn")!;
    this.cancelResetBtn = document.getElementById("cancelResetBtn")!;

    this.populateAvatarOptions();
    this.checkLoginStatus();
  }

  private addEventListeners() {
    this.loginButton?.addEventListener("click", () => this.login());
    this.addStudentBtn?.addEventListener("click", () => this.openModal());
    this.submitStudentBtn?.addEventListener("click", () => this.addStudent());
    this.closeModalBtn?.addEventListener("click", () => this.closeModal());
    this.resetPointsBtn?.addEventListener("click", () =>
      this.showResetConfirmation()
    );
    this.giveAllPointsBtn?.addEventListener("click", () =>
      this.giveAllStudentsOnePoint()
    );
    this.confirmResetBtn?.addEventListener("click", () =>
      this.resetAllPoints()
    );
    this.cancelResetBtn?.addEventListener("click", () =>
      this.closeResetConfirmation()
    );
    this.logoutBtn?.addEventListener("click", () => this.logout());
    this.trexModeBtn?.addEventListener("click", () => this.toggleTrexMode());

    // Bulk management event listeners
    this.toggleSelectionModeBtn?.addEventListener("click", () => this.toggleSelectionMode());
    this.selectAllBtn?.addEventListener("click", () => this.selectAllStudents());
    this.selectNoneBtn?.addEventListener("click", () => this.selectNoneStudents());
    this.bulkAddPointBtn?.addEventListener("click", () => this.bulkAddPoints());
    this.bulkRemovePointBtn?.addEventListener("click", () => this.bulkRemovePoints());
  }

  private checkLoginStatus() {
    // Since we now have class-based authentication, and the constructor already checked for valid session,
    // we can directly show the content for teacher view
    this.showContent();
  }

  private isLoginValid(): boolean {
    const loginTimestamp = localStorage.getItem("loginTimestamp");
    if (!loginTimestamp) return false;

    const currentTime = new Date().getTime();
    const loginTime = parseInt(loginTimestamp, 10);
    const hoursSinceLogin = (currentTime - loginTime) / (1000 * 60 * 60);

    return hoursSinceLogin < 24;
  }

  private setLoginTimestamp(): void {
    localStorage.setItem("loginTimestamp", new Date().getTime().toString());
  }

  private login() {
    console.log("Login function called");
    // Authentication is now handled at the class selection level
    // Just show the content directly
    console.log("Bypassing password check - authentication handled by class selection");
    this.setLoginTimestamp();
    console.log("Showing content");
    this.showContent();
  }

  private showLoginOverlay() {
    this.loginOverlay.style.display = "flex";
    this.mainContent.classList.add("blurred");
    this.logoutBtn.style.display = "none"; // Hide logout button when logged out
  }

  private showContent() {
    this.loginOverlay.style.display = "none";
    this.mainContent.classList.remove("blurred");
    this.logoutBtn.style.display = "block"; // Show logout button when logged in
    this.populateAvatarOptions(); // Add this line
    this.loadStudents();
  }

  private populateAvatarOptions(): void {
    const avatarSelect = document.getElementById(
      "studentAvatar"
    ) as HTMLSelectElement;
    avatarSelect.innerHTML = this.getAvatarOptions("");
  }

  private async loadStudents(): Promise<void> {
    if (!this.currentSession) {
      console.error("No session found, cannot load students");
      return;
    }

    const { data, error } = await supabase
      .from("students")
      .select("*")
      .eq("class_id", this.currentSession.class_id);

    if (error) {
      console.error("Error loading students:", error);
      return;
    }

    this.students = data || [];
    this.renderStudents();
  }

  private getAvatarOptions(selectedAvatar: string): string {
    const avatars = [
      "😀",
      "😎",
      "🤓",
      "🧑‍🎓",
      "👩‍🎓",
      "👨‍🎓",
      "🦄",
      "🐶",
      "🐱",
      "🦊",
      "🦁",
      "🐯",
      "🐸",
      "🐵",
      "🐼",
      "🐨",
      "🐷",
      "🐙",
      "🐬",
      "🦋",
      "🦖",
      "🦕",
      "🚀",
      "🌈",
      "🍕",
      "🍦",
      "🎨",
      "🏀",
      "⚽",
      "🎸",
    ];
    return avatars
      .map(
        (avatar) =>
          `<option value="${avatar}" ${
            avatar === selectedAvatar ? "selected" : ""
          }>${avatar}</option>`
      )
      .join("");
  }

  private renderStudents(): void {
    // Sort students alphabetically by name
    this.students.sort((a, b) => a.name.localeCompare(b.name));

    this.studentGrid.innerHTML = "";
    this.students.forEach((student) => {
      const studentCard = document.createElement("div");
      studentCard.className = "student-card";
      studentCard.dataset.studentId = student.id;

      if (this.isStudentView) {
        studentCard.innerHTML = `
          <div class="student-info">
            <div class="student-avatar">${student.avatar}</div>
            <h3 class="student-name">${student.name}</h3>
          </div>
          <div class="points-container">
            <div class="student-points">${student.points}</div>
          </div>
        `;
      } else {
        studentCard.innerHTML = `
          ${this.isSelectionModeActive ? `
          <div class="student-checkbox">
            <input type="checkbox" class="select-student" data-student-id="${student.id}">
          </div>
          ` : ''}
          <div class="student-info">
            <div class="student-avatar">${student.avatar}</div>
            <h3 class="student-name">${student.name}</h3>
          </div>
          <div class="points-container">
            <div class="student-points">${student.points}</div>
            <div class="point-buttons">
              <button class="remove-point">-</button>
              <button class="add-point">+</button>
            </div>
          </div>
          <div class="edit-icon">✏️</div>
          <div class="edit-controls" style="display: none;">
            <input type="text" class="edit-name" value="${student.name}">
            <select class="edit-avatar">
              ${this.getAvatarOptions(student.avatar)}
            </select>
            <input type="number" class="edit-points" value="${student.points}">
            <div class="button-container">
              <button class="save-edit">Save</button>
              <button class="delete-student">Delete</button>
            </div>
          </div>
        `;

        const addPointBtn = studentCard.querySelector(".add-point");
        const removePointBtn = studentCard.querySelector(".remove-point");
        const editIcon = studentCard.querySelector(".edit-icon");
        const saveEditBtn = studentCard.querySelector(".save-edit");
        const deleteStudentBtn = studentCard.querySelector(".delete-student");
        const checkbox = studentCard.querySelector(".select-student") as HTMLInputElement;

        addPointBtn?.addEventListener("click", () =>
          this.updatePoints(student.id, 1)
        );
        removePointBtn?.addEventListener("click", () =>
          this.updatePoints(student.id, -1)
        );
        editIcon?.addEventListener("click", () =>
          this.toggleEditMode(studentCard)
        );
        saveEditBtn?.addEventListener("click", () =>
          this.saveStudentEdit(student.id, studentCard)
        );
        deleteStudentBtn?.addEventListener("click", () =>
          this.deleteStudent(student.id)
        );

        // Add checkbox change listener only in selection mode
        if (this.isSelectionModeActive) {
          checkbox?.addEventListener("change", () => this.updateSelectionCount());
        }
      }

      this.studentGrid.appendChild(studentCard);
    });
  }

  private toggleEditMode(studentCard: HTMLElement): void {
    const editControls = studentCard.querySelector(".edit-controls");
    const displayElements = studentCard.querySelectorAll(
      ".student-avatar, .student-name, .points-container"
    );

    if (editControls?.getAttribute("style") === "display: none;") {
      // Entering edit mode
      editControls.setAttribute("style", "display: block;");
      displayElements.forEach((el) =>
        el.setAttribute("style", "display: none;")
      );

      // Ensure input values are set correctly
      const student = this.students.find(
        (s) => s.id === studentCard.dataset.studentId
      );
      if (student) {
        const nameInput = editControls.querySelector(
          ".edit-name"
        ) as HTMLInputElement;
        const avatarSelect = editControls.querySelector(
          ".edit-avatar"
        ) as HTMLSelectElement;
        const pointsInput = editControls.querySelector(
          ".edit-points"
        ) as HTMLInputElement;

        nameInput.value = student.name;
        avatarSelect.value = student.avatar;
        pointsInput.value = student.points.toString();
      }
    } else {
      // Exiting edit mode
      editControls?.setAttribute("style", "display: none;");
      displayElements.forEach((el) => el.removeAttribute("style"));
    }
  }

  private async saveStudentEdit(
    id: string,
    studentCard: HTMLElement
  ): Promise<void> {
    const nameInput = studentCard.querySelector(
      ".edit-name"
    ) as HTMLInputElement;
    const avatarSelect = studentCard.querySelector(
      ".edit-avatar"
    ) as HTMLSelectElement;
    const pointsInput = studentCard.querySelector(
      ".edit-points"
    ) as HTMLInputElement;

    const updatedStudent: Partial<Student> = {
      name: nameInput.value.trim(),
      avatar: avatarSelect.value,
      points: parseInt(pointsInput.value, 10),
    };

    const { data, error } = await supabase
      .from("students")
      .update(updatedStudent)
      .eq("id", id)
      .select();

    if (error) {
      console.error("Error updating student:", error);
      return;
    }

    if (data) {
      const studentIndex = this.students.findIndex((s) => s.id === id);
      this.students[studentIndex] = data[0];
      this.renderStudents();
    }
  }

  private async deleteStudent(id: string): Promise<void> {
    if (confirm("Are you sure you want to delete this student?")) {
      const { error } = await supabase.from("students").delete().eq("id", id);

      if (error) {
        console.error("Error deleting student:", error);
        return;
      }

      this.students = this.students.filter((s) => s.id !== id);
      this.renderStudents();
    }
  }

  private async updatePoints(id: string, change: number): Promise<void> {
    const studentIndex = this.students.findIndex((s) => s.id === id);
    const newPoints = Math.max(0, this.students[studentIndex].points + change);

    const { data, error } = await supabase
      .from("students")
      .update({ points: newPoints })
      .eq("id", id)
      .select();

    if (error) {
      console.error("Error updating points:", error);
      return;
    }

    if (data) {
      this.students[studentIndex] = data[0];
      this.renderStudents();

      if (change > 0) {
        // Play sound before showing confetti
        await this.playPointSound();
        this.showConfetti();
      }
    }
  }

  private async initAudio(): Promise<void> {
    this.audioContext = new (window.AudioContext ||
      (window as any).webkitAudioContext)();
    try {
      const response = await fetch(
        "https://assets.mixkit.co/active_storage/sfx/2000/2000-preview.mp3"
      );
      const arrayBuffer = await response.arrayBuffer();
      this.audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
    } catch (error) {
      console.error("Error initializing audio:", error);
    }
  }

  private async playPointSound(): Promise<void> {
    if (!this.audioContext || !this.audioBuffer) {
      console.error("Audio not initialized");
      return;
    }

    // Resume audio context if it's suspended
    if (this.audioContext.state === "suspended") {
      await this.audioContext.resume();
    }

    const source = this.audioContext.createBufferSource();
    source.buffer = this.audioBuffer;
    source.connect(this.audioContext.destination);
    source.start(0);
  }

  private showConfetti(): void {
    const canvas = document.getElementById(
      "confetti-canvas"
    ) as HTMLCanvasElement;
    const myConfetti = confetti.create(canvas, {
      resize: true,
      useWorker: true,
    });

    const isMobile = window.innerWidth <= 768;

    const count = isMobile ? 100 : 200;
    const defaults = {
      origin: { y: isMobile ? 0.2 : 0.7 },
      spread: isMobile ? 60 : 360,
      ticks: isMobile ? 50 : 100,
      gravity: 0.5,
      decay: 0.94,
      startVelocity: isMobile ? 15 : 30,
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      myConfetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    if (isMobile) {
      fire(0.25, {
        spread: 26,
        startVelocity: 25,
      });

      fire(0.2, {
        spread: 40,
      });

      fire(0.35, {
        spread: 60,
        decay: 0.91,
        scalar: 0.8,
      });

      fire(0.1, {
        spread: 80,
        startVelocity: 15,
        decay: 0.92,
        scalar: 1.2,
      });

      fire(0.1, {
        spread: 80,
        startVelocity: 25,
      });
    } else {
      fire(0.25, {
        spread: 26,
        startVelocity: 55,
      });

      fire(0.2, {
        spread: 60,
      });

      fire(0.35, {
        spread: 100,
        decay: 0.91,
        scalar: 0.8,
      });

      fire(0.1, {
        spread: 120,
        startVelocity: 25,
        decay: 0.92,
        scalar: 1.2,
      });

      fire(0.1, {
        spread: 120,
        startVelocity: 45,
      });
    }
  }

  private openModal(): void {
    this.addStudentModal.style.display = "block";
  }

  private closeModal(): void {
    this.addStudentModal.style.display = "none";
  }

  private async addStudent(): Promise<void> {
    const nameInput = document.getElementById(
      "studentName"
    ) as HTMLInputElement;
    const avatarSelect = document.getElementById(
      "studentAvatar"
    ) as HTMLSelectElement;
    const name = nameInput.value.trim();
    const avatar = avatarSelect.value;

    if (name) {
      if (!this.currentSession) {
        console.error("No session found, cannot add student");
        return;
      }

      const newStudent: Omit<Student, "id"> = {
        name: name,
        avatar: avatar,
        points: 0,
        class_id: this.currentSession.class_id,
      };

      const { data, error } = await supabase
        .from("students")
        .insert([newStudent])
        .select();

      if (error) {
        console.error("Error adding student:", error);
        return;
      }

      if (data) {
        this.students.push(data[0]);
        this.renderStudents();
        this.closeModal();
        nameInput.value = "";
        avatarSelect.selectedIndex = 0;
      }
    }
  }

  private showResetConfirmation(): void {
    this.confirmResetModal.style.display = "block";
  }

  private closeResetConfirmation(): void {
    this.confirmResetModal.style.display = "none";
  }

  private async resetAllPoints(): Promise<void> {
    this.closeResetConfirmation();

    for (const student of this.students) {
      const { error } = await supabase
        .from("students")
        .update({ points: 0 })
        .eq("id", student.id);

      if (error) {
        console.error(
          `Error resetting points for student ${student.id}:`,
          error
        );
      }
    }

    // Reload students after resetting points
    await this.loadStudents();
  }

  private async giveAllStudentsOnePoint(): Promise<void> {
    for (const student of this.students) {
      const { error } = await supabase
        .from("students")
        .update({ points: student.points + 1 })
        .eq("id", student.id);

      if (error) {
        console.error(`Error giving point to student ${student.id}:`, error);
      }
    }

    // Reload students after giving points
    await this.loadStudents();

    // Play sound and show confetti for all students
    await this.playPointSound();
    this.showConfetti();
  }

  private logout(): void {
    // Clear the session and redirect to class selection
    this.clearSession();
    window.location.href = 'index.html';
  }

  private toggleTrexMode(): void {
    this.isTrexModeActive = !this.isTrexModeActive;

    if (this.isTrexModeActive) {
      document.body.classList.add("trex-background");
      this.trexModeBtn.textContent = "Exit T-Rex Mode";

      // Play audio
      this.trexAudio?.play().catch((e) => console.error("Audio error:", e));

      // Play video
      if (this.trexVideo) {
        // Make video visible first
        this.trexVideo.style.display = "block";
        // Set the video source to the GitHub release URL
        this.trexVideo.src =
          "https://github.com/itsthemoon/dojo/releases/download/video/jurparkvideo.mp4";

        // Small timeout to ensure display change is processed
        setTimeout(() => {
          try {
            // Force reload the video
            this.trexVideo!.load();

            // Try to play
            const playPromise = this.trexVideo!.play();
            if (playPromise !== undefined) {
              playPromise.catch((e) => {
                console.error("Video playback error:", e);
                // If autoplay fails, at least the controls are visible for manual play
                alert("Please click the play button to start the video");
              });
            }
          } catch (err) {
            console.error("Video error:", err);
          }
        }, 100);
      }
    } else {
      document.body.classList.remove("trex-background");
      this.trexModeBtn.textContent = "T-Rex Mode";

      // Stop audio
      this.trexAudio?.pause();
      if (this.trexAudio) {
        this.trexAudio.currentTime = 0;
      }

      // Stop video
      if (this.trexVideo) {
        this.trexVideo.pause();
        this.trexVideo.currentTime = 0;
        this.trexVideo.style.display = "none";
      }
    }
  }

  private initializeTrexAudio(): void {
    this.trexAudio = new Audio("./public/Theme From Jurassic Park.mp3");
    this.trexAudio.loop = true;
  }

  private updateClassContext(): void {
    if (!this.currentSession) return;

    // Update page header with class information
    const header = document.querySelector('header h1');
    if (header) {
      header.textContent = `${this.currentSession.class_name} - ${this.currentSession.teacher_name}`;
    }

    // Update teacher emoji if available
    const teacherAvatar = document.querySelector('.teacher-avatar');
    if (teacherAvatar && this.currentSession.teacher_emoji) {
      teacherAvatar.textContent = this.currentSession.teacher_emoji;
    }

    // Add "Switch Class" button to header
    this.addSwitchClassButton();
  }

  private addSwitchClassButton(): void {
    const headerRight = document.querySelector('.header-right') || this.createHeaderRight();

    const switchClassBtn = document.createElement('button');
    switchClassBtn.textContent = 'Switch Class';
    switchClassBtn.className = 'button switch-class-btn';
    switchClassBtn.addEventListener('click', () => {
      this.clearSession();
      window.location.href = 'index.html';
    });

    headerRight.appendChild(switchClassBtn);
  }

  private createHeaderRight(): HTMLElement {
    const headerRight = document.createElement('div');
    headerRight.className = 'header-right';

    const header = document.querySelector('header');
    if (header) {
      header.appendChild(headerRight);
    }

    return headerRight;
  }

  // Session Management
  public getSession(): SessionData | null {
    const sessionData = sessionStorage.getItem('dojoSession');
    return sessionData ? JSON.parse(sessionData) : null;
  }

  public setSession(session: SessionData): void {
    this.currentSession = session;
    sessionStorage.setItem('dojoSession', JSON.stringify(session));
  }

  public clearSession(): void {
    this.currentSession = null;
    sessionStorage.removeItem('dojoSession');
  }

  // Class Management
  public async getAllClasses(): Promise<Class[]> {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .order('teacher_name');

    if (error) {
      console.error('Error fetching classes:', error);
      throw error;
    }

    return data || [];
  }

  public async verifyAdminPassword(password: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('admin_passwords')
      .select('password_hash')
      .limit(1);

    if (error || !data || data.length === 0) {
      console.error('Error fetching admin password:', error);
      return false;
    }

    return bcrypt.compareSync(password, data[0].password_hash);
  }

  public async verifyClassPassword(classId: string, password: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('classes')
      .select('password_hash')
      .eq('id', classId)
      .single();

    if (error || !data) {
      console.error('Error fetching class password:', error);
      return false;
    }

    return bcrypt.compareSync(password, data.password_hash);
  }

  public async createClass(teacherName: string, teacherEmoji: string, className: string, password: string): Promise<string> {
    const passwordHash = bcrypt.hashSync(password, 12);

    const { data, error } = await supabase
      .from('classes')
      .insert({
        teacher_name: teacherName,
        teacher_emoji: teacherEmoji,
        class_name: className,
        password_hash: passwordHash
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating class:', error);
      throw error;
    }

    return data.id;
  }

  public async getClassById(classId: string): Promise<Class | null> {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .single();

    if (error) {
      console.error('Error fetching class:', error);
      return null;
    }

    return data;
  }

  // Bulk Management Methods
  private toggleSelectionMode(): void {
    this.isSelectionModeActive = !this.isSelectionModeActive;

    if (this.isSelectionModeActive) {
      // Enable selection mode
      this.toggleSelectionModeBtn.textContent = "Exit Selection";
      this.toggleSelectionModeBtn.classList.add("active");
      this.bulkControls.style.display = "block";

      // Add selection mode class to body for styling
      document.body.classList.add("selection-mode");
    } else {
      // Disable selection mode
      this.toggleSelectionModeBtn.textContent = "Select Multiple";
      this.toggleSelectionModeBtn.classList.remove("active");
      this.bulkControls.style.display = "none";

      // Remove selection mode class from body
      document.body.classList.remove("selection-mode");

      // Clear any selections
      this.selectNoneStudents();
    }

    // Re-render students to show/hide checkboxes
    this.renderStudents();
  }

  private selectAllStudents(): void {
    const checkboxes = document.querySelectorAll('.select-student') as NodeListOf<HTMLInputElement>;
    checkboxes.forEach(checkbox => {
      checkbox.checked = true;
    });
    this.updateSelectionCount();
  }

  private selectNoneStudents(): void {
    const checkboxes = document.querySelectorAll('.select-student') as NodeListOf<HTMLInputElement>;
    checkboxes.forEach(checkbox => {
      checkbox.checked = false;
    });
    this.updateSelectionCount();
  }

  private updateSelectionCount(): void {
    const checkboxes = document.querySelectorAll('.select-student') as NodeListOf<HTMLInputElement>;
    const selectedCount = Array.from(checkboxes).filter(cb => cb.checked).length;

    this.selectionCount.textContent = `${selectedCount} student${selectedCount !== 1 ? 's' : ''} selected`;

    // Enable/disable bulk action buttons based on selection
    const hasSelection = selectedCount > 0;
    this.bulkAddPointBtn.disabled = !hasSelection;
    this.bulkRemovePointBtn.disabled = !hasSelection;
  }

  private getSelectedStudentIds(): string[] {
    const checkboxes = document.querySelectorAll('.select-student:checked') as NodeListOf<HTMLInputElement>;
    return Array.from(checkboxes).map(cb => cb.dataset.studentId!);
  }

  private async bulkAddPoints(): Promise<void> {
    const selectedIds = this.getSelectedStudentIds();
    if (selectedIds.length === 0) return;

    try {
      for (const studentId of selectedIds) {
        const student = this.students.find(s => s.id === studentId);
        if (student) {
          await this.updatePoints(studentId, 1);
        }
      }

      // Clear selection after bulk operation
      this.selectNoneStudents();

      // Play celebration sound and confetti for bulk point addition
      await this.playPointSound();
      this.showConfetti();
    } catch (error) {
      console.error('Error adding bulk points:', error);
    }
  }

  private async bulkRemovePoints(): Promise<void> {
    const selectedIds = this.getSelectedStudentIds();
    if (selectedIds.length === 0) return;

    try {
      for (const studentId of selectedIds) {
        const student = this.students.find(s => s.id === studentId);
        if (student) {
          await this.updatePoints(studentId, -1);
        }
      }

      // Clear selection after bulk operation
      this.selectNoneStudents();
    } catch (error) {
      console.error('Error removing bulk points:', error);
    }
  }
}

// Class Selection Handler for Homepage
class ClassSelectionHandler {
  private studentClassSelect: HTMLSelectElement;
  private teacherClassSelect: HTMLSelectElement;
  private classPassword: HTMLInputElement;
  private joinAsTeacher: HTMLButtonElement;
  private joinAsStudent: HTMLButtonElement;
  private createClassBtn: HTMLButtonElement;
  private createClassModal: HTMLElement;
  private closeCreateModal: HTMLElement;
  private adminPassword: HTMLInputElement;
  private teacherName: HTMLInputElement;
  private teacherEmoji: HTMLSelectElement;
  private className: HTMLInputElement;
  private newClassPassword: HTMLInputElement;
  private submitCreateClass: HTMLButtonElement;
  private cancelCreateClass: HTMLButtonElement;

  constructor() {
    this.initializeElements();
    this.bindEvents();
    this.loadClasses();
  }

  private initializeElements(): void {
    this.studentClassSelect = document.getElementById('studentClassSelect') as HTMLSelectElement;
    this.teacherClassSelect = document.getElementById('teacherClassSelect') as HTMLSelectElement;
    this.classPassword = document.getElementById('classPassword') as HTMLInputElement;
    this.joinAsTeacher = document.getElementById('joinAsTeacher') as HTMLButtonElement;
    this.joinAsStudent = document.getElementById('joinAsStudent') as HTMLButtonElement;
    this.createClassBtn = document.getElementById('createClassBtn') as HTMLButtonElement;
    this.createClassModal = document.getElementById('createClassModal') as HTMLElement;
    this.closeCreateModal = document.getElementById('closeCreateModal') as HTMLElement;
    this.adminPassword = document.getElementById('adminPassword') as HTMLInputElement;
    this.teacherName = document.getElementById('teacherName') as HTMLInputElement;
    this.teacherEmoji = document.getElementById('teacherEmoji') as HTMLSelectElement;
    this.className = document.getElementById('className') as HTMLInputElement;
    this.newClassPassword = document.getElementById('newClassPassword') as HTMLInputElement;
    this.submitCreateClass = document.getElementById('submitCreateClass') as HTMLButtonElement;
    this.cancelCreateClass = document.getElementById('cancelCreateClass') as HTMLButtonElement;
  }

  private bindEvents(): void {
    this.joinAsTeacher.addEventListener('click', () => this.joinClass('teacher'));
    this.joinAsStudent.addEventListener('click', () => this.joinClass('student'));
    this.createClassBtn.addEventListener('click', () => this.openCreateModal());
    this.closeCreateModal.addEventListener('click', () => this.closeCreateModalHandler());
    this.cancelCreateClass.addEventListener('click', () => this.closeCreateModalHandler());

    // Prevent form submission and handle click properly
    this.submitCreateClass.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.handleCreateClass();
    });

    // Also handle Enter key in form fields
    const formInputs = [this.adminPassword, this.teacherName, this.className, this.newClassPassword];
    formInputs.forEach(input => {
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          this.handleCreateClass();
        }
      });
    });

    // Close modal when clicking outside
    this.createClassModal.addEventListener('click', (e) => {
      if (e.target === this.createClassModal) {
        this.closeCreateModalHandler();
      }
    });
  }

  private async loadClasses(): Promise<void> {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .order('teacher_name');

      if (error) throw error;

      // Populate both dropdowns
      this.studentClassSelect.innerHTML = '<option value="">Select a class...</option>';
      this.teacherClassSelect.innerHTML = '<option value="">Select your class...</option>';

      if (data && data.length > 0) {
        data.forEach((cls: Class) => {
          // Student dropdown option
          const studentOption = document.createElement('option');
          studentOption.value = cls.id;
          studentOption.textContent = `${cls.teacher_name} - ${cls.class_name}`;
          this.studentClassSelect.appendChild(studentOption);

          // Teacher dropdown option
          const teacherOption = document.createElement('option');
          teacherOption.value = cls.id;
          teacherOption.textContent = `${cls.teacher_name} - ${cls.class_name}`;
          this.teacherClassSelect.appendChild(teacherOption);
        });
      } else {
        this.studentClassSelect.innerHTML = '<option value="">No classes available</option>';
        this.teacherClassSelect.innerHTML = '<option value="">No classes available</option>';
      }
    } catch (error) {
      console.error('Error loading classes:', error);
      this.showMessage('Error loading classes. Please refresh the page.', 'error');
    }
  }

  private async joinClass(role: 'teacher' | 'student'): Promise<void> {
    let classId: string;

    if (role === 'teacher') {
      classId = this.teacherClassSelect.value;
      const password = this.classPassword.value;

      if (!classId) {
        this.showMessage('Please select your class.', 'error');
        return;
      }

      if (!password) {
        this.showMessage('Please enter the class password.', 'error');
        return;
      }

      try {
        // Verify password for teachers
        const isValid = await this.verifyClassPassword(classId, password);
        if (!isValid) {
          this.showMessage('Incorrect password. Please try again.', 'error');
          return;
        }
      } catch (error) {
        console.error('Error verifying password:', error);
        this.showMessage('Error verifying password. Please try again.', 'error');
        return;
      }
    } else {
      // Student - no password required
      classId = this.studentClassSelect.value;

      if (!classId) {
        this.showMessage('Please select a class.', 'error');
        return;
      }
    }

    try {
      // Get class details
      const classData = await this.getClassById(classId);
      if (!classData) {
        this.showMessage('Class not found.', 'error');
        return;
      }

      // Set session
      const session: SessionData = {
        class_id: classData.id,
        class_name: classData.class_name,
        teacher_name: classData.teacher_name,
        teacher_emoji: classData.teacher_emoji
      };

      sessionStorage.setItem('dojoSession', JSON.stringify(session));

      // Redirect based on role
      if (role === 'teacher') {
        window.location.href = 'teacher.html';
      } else {
        window.location.href = 'student.html';
      }

    } catch (error) {
      console.error('Error joining class:', error);
      this.showMessage('Error joining class. Please try again.', 'error');
    }
  }

  private openCreateModal(): void {
    this.createClassModal.style.display = 'block';
    this.clearCreateForm();
  }

  private closeCreateModalHandler(): void {
    this.createClassModal.style.display = 'none';
    this.clearCreateForm();
  }

  private clearCreateForm(): void {
    this.adminPassword.value = '';
    this.teacherName.value = '';
    this.teacherEmoji.value = '👩‍🏫';
    this.className.value = '';
    this.newClassPassword.value = '';
  }

  private setCreateButtonLoading(loading: boolean): void {
    if (loading) {
      this.submitCreateClass.disabled = true;
      this.submitCreateClass.textContent = 'Creating Class...';
      this.submitCreateClass.classList.add('loading');
    } else {
      this.submitCreateClass.disabled = false;
      this.submitCreateClass.textContent = 'Create Class';
      this.submitCreateClass.classList.remove('loading');
    }
  }

  private async handleCreateClass(): Promise<void> {
    // Prevent double-clicking
    if (this.submitCreateClass.disabled) {
      return;
    }

    const adminPwd = this.adminPassword.value;
    const teacher = this.teacherName.value;
    const teacherEmoji = this.teacherEmoji.value;
    const className = this.className.value;
    const classPwd = this.newClassPassword.value;

    if (!adminPwd || !teacher || !teacherEmoji || !className || !classPwd) {
      this.showMessage('Please fill in all fields.', 'error');
      return;
    }

    // Disable button and show loading state
    this.setCreateButtonLoading(true);

    try {
      // Verify admin password
      const isAdminValid = await this.verifyAdminPassword(adminPwd);
      if (!isAdminValid) {
        this.showMessage('Invalid admin password.', 'error');
        this.setCreateButtonLoading(false);
        return;
      }

      // Create class
      const classId = await this.createClass(teacher, teacherEmoji, className, classPwd);

      this.showMessage('Class created successfully!', 'success');
      this.closeCreateModalHandler();
      this.loadClasses(); // Refresh the dropdown

      // Auto-select the new class in the teacher dropdown
      setTimeout(() => {
        this.teacherClassSelect.value = classId;
      }, 500);

    } catch (error) {
      console.error('Error creating class:', error);
      this.showMessage('Error creating class. Please try again.', 'error');
    } finally {
      this.setCreateButtonLoading(false);
    }
  }

  private async verifyAdminPassword(password: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('admin_passwords')
      .select('password_hash')
      .limit(1);

    if (error || !data || data.length === 0) {
      console.error('Error fetching admin password:', error);
      return false;
    }

    return bcrypt.compareSync(password, data[0].password_hash);
  }

  private async verifyClassPassword(classId: string, password: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('classes')
      .select('password_hash')
      .eq('id', classId)
      .single();

    if (error || !data) {
      console.error('Error fetching class password:', error);
      return false;
    }

    return bcrypt.compareSync(password, data.password_hash);
  }

  private async createClass(teacherName: string, teacherEmoji: string, className: string, password: string): Promise<string> {
    const passwordHash = bcrypt.hashSync(password, 12);

    const { data, error } = await supabase
      .from('classes')
      .insert({
        teacher_name: teacherName,
        teacher_emoji: teacherEmoji,
        class_name: className,
        password_hash: passwordHash
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating class:', error);
      throw error;
    }

    return data.id;
  }

  private async getClassById(classId: string): Promise<Class | null> {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .single();

    if (error) {
      console.error('Error fetching class:', error);
      return null;
    }

    return data;
  }

  private showMessage(message: string, type: 'success' | 'error'): void {
    const existingMessage = document.querySelector('.success-message, .error-message');
    if (existingMessage) {
      existingMessage.remove();
    }

    const messageEl = document.createElement('div');
    messageEl.className = `${type}-message`;
    messageEl.textContent = message;

    const container = document.querySelector('.class-selection-container');
    if (container) {
      container.insertBefore(messageEl, container.firstChild);

      setTimeout(() => {
        messageEl.remove();
      }, 5000);
    }
  }
}

// Initialize the app
document.addEventListener("DOMContentLoaded", () => {
  // Check if we're on the class selection page (homepage)
  if (document.getElementById('classSelection')) {
    new ClassSelectionHandler();
    console.log('Class selection handler initialized');
  }
  // Check if we're on the classroom management pages (teacher/student)
  else if (
    document
      .querySelector("body")
      .contains(document.getElementById("studentGrid"))
  ) {
    const app = new ClassroomManagement();
    if (document.body.classList.contains("student-view")) {
      console.log("Student application initialized");
    } else {
      console.log("Teacher application initialized");
    }
  }
});
